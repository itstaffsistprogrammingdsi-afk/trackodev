import { useCallback, useEffect, useState } from "react";

import api from "@/lib/axios";

import { Card, User } from "../types";

interface ReturnType {
  detail: Card | null;

  users: User[];

  loading: boolean;

  fetchDetail: () => Promise<void>;

  setDetail: React.Dispatch<
    React.SetStateAction<Card | null>
  >;
}

export function useCardDetail(
  card: Card | null,
  isOpen: boolean,
): ReturnType {
  // =========================================
  // STATE
  // =========================================
  const [detail, setDetail] = useState<Card | null>(
    null,
  );

  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(false);

  // =========================================
  // FETCH DETAIL
  // =========================================
  const fetchDetail = useCallback(async () => {
    if (!card) return;

    setLoading(true);

    try {
      const [cardRes, userRes] = await Promise.all([
        api.get(`/cards/${card.id}`),
        api.get(`/users`),
      ]);

      setDetail(cardRes.data.data);

      setUsers(userRes.data.data || []);
    } catch (err) {
      console.error(
        "FAILED FETCH CARD DETAIL",
        err,
      );
    } finally {
      setLoading(false);
    }
  }, [card]);

  // =========================================
  // INITIAL FETCH
  // =========================================
  useEffect(() => {
    if (card && isOpen) {
      fetchDetail();
    }
  }, [card, isOpen, fetchDetail]);

  return {
    detail,

    users,

    loading,

    fetchDetail,

    setDetail,
  };
}