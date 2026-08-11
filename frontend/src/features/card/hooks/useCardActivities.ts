import { useCallback, useEffect, useRef, useState } from "react";
import type { ActivityInsight, ActivityLog } from "../types";
import { getCardActivities } from "../api/card.api";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";

type ActivityResponse = {
  success: boolean;
  card_id: string;
  total_logs: number;
  has_more: boolean;
  insight?: ActivityInsight;
  activities: ActivityLog[];
};

export default function useCardActivities(cardId?: string, isOpen?: boolean) {
  const realtimeRevision = useRealtimeRevision(["ActivityLog"]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [insight, setInsight] = useState<ActivityInsight | null>(null);
  const requestRef = useRef(0);
  const activeQueryRef = useRef<string | null>(null);
  const limit = 8;

  const fetchActivities = useCallback(async (newPage = 1) => {
    if (!cardId) return;
    const requestId = ++requestRef.current;

    try {
      setLoading(true);
      const res: ActivityResponse = await getCardActivities(
        cardId,
        newPage,
        limit,
        "all"
      );
      const list = Array.isArray(res.activities) ? res.activities : [];
      if (requestId !== requestRef.current) return;

      if (newPage === 1) {
        setActivities(list);
      } else {
        setActivities((previous) => {
          const known = new Set(previous.map((activity) => activity.id));
          return [
            ...previous,
            ...list.filter((activity) => !known.has(activity.id)),
          ];
        });
      }

      setTotal(res.total_logs ?? 0);
      setInsight(res.insight ?? null);
      setHasMore(Boolean(res.has_more));
    } catch (error) {
      if (requestId === requestRef.current) {
        console.error("Failed to fetch activities:", error);
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    if (!isOpen || !cardId) return;

    const queryKey = cardId;
    setPage(1);
    if (activeQueryRef.current !== queryKey) {
      activeQueryRef.current = queryKey;
      setActivities([]);
      setHasMore(true);
    }
    fetchActivities(1);

    return () => {
      requestRef.current += 1;
    };
  }, [cardId, fetchActivities, isOpen, realtimeRevision]);

  const loadMore = () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(nextPage);
  };

  const refresh = () => {
    setPage(1);
    fetchActivities(1);
  };

  return {
    activities,
    loading,
    page,
    hasMore,
    total,
    insight,
    loadMore,
    refresh,
  };
}
