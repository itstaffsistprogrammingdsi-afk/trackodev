import { useEffect, useState } from "react";
import type { ActivityLog } from "../types";
import { getCardActivities } from "../api/card.api";

type ActivityResponse = {
  success: boolean;
  card_id: string;
  total_logs: number;
  activities: ActivityLog[];
};

export default function useCardActivities(
  cardId?: string,
  isOpen?: boolean
) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const limit = 8;

  const fetchActivities = async (newPage = 1) => {
    if (!cardId) return;

    try {
      setLoading(true);

      const res: ActivityResponse = await getCardActivities(
        cardId,
        newPage,
        limit
      );

      const list = Array.isArray(res.activities) ? res.activities : [];

      if (newPage === 1) {
        setActivities(list);
      } else {
        setActivities((prev) => [...prev, ...list]);
      }

      setTotal(res.total_logs ?? 0);

      // kalau data kurang dari limit → habis
      setHasMore(list.length === limit);
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !cardId) return;

    setPage(1);
    fetchActivities(1);
  }, [cardId, isOpen]);

  const loadMore = () => {
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
    loadMore,
    refresh,
  };
}