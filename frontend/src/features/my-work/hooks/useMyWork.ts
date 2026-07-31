import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getMyActivities,
} from "../api/myWork.api";

import type {
  ActivityRange,
  ActivityResponse,
} from "../types";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";

export const useMyWork = () => {
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [range, setRange] = useState<ActivityRange>("week");
  const [activities, setActivities] = useState<ActivityResponse | null>(null);
  const realtimeRevision = useRealtimeRevision([
    "ActivityLog", "Assignment", "Card", "CardAttachment", "Task",
  ]);

  const loadActivities = useCallback(async (selectedRange: ActivityRange) => {
    try {
      setActivityLoading(true);
      setError(null);
      const activityRes = await getMyActivities(
        selectedRange,
        1,
        50,
        "card_movement",
      );
      setActivities(activityRes);
    } catch {
      setError("Failed to load My Work data");
    } finally {
      setActivityLoading(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities(range);
  }, [loadActivities, range, realtimeRevision]);

  const reload = useCallback(
    () => loadActivities(range),
    [loadActivities, range],
  );

  return {
    loading,
    activityLoading,
    error,
    range,
    setRange,
    activities,
    reload,
  };
};
