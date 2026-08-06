import { useCallback, useEffect, useState } from "react";

import api from "@/lib/axios";

import { Card, User } from "../types";

import { getUsers } from "@/features/user/api/user.api";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";

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
  const realtimeRevision = useRealtimeRevision([
    "ActivityLog", "Assignment", "Brand", "Card", "Label", "User",
  ]);
  // =========================================
  // STATE
  // =========================================
  const [detail, setDetail] =
    useState<Card | null>(null);

  const [users, setUsers] = useState<User[]>(
    [],
  );

  const [loading, setLoading] =
    useState(false);

  // =========================================
  // FETCH CARD DETAIL
  // =========================================
  const fetchDetail = useCallback(async () => {
    if (!card?.id) return;

    setLoading(true);

    try {
      const cardRes = await api.get(
        `/cards/${card.id}`,
      );

      setDetail(cardRes.data.data);
    } catch (err) {
      console.error(
        "FAILED FETCH CARD DETAIL",
        err,
      );
    } finally {
      setLoading(false);
    }
  }, [card?.id]);

  // =========================================
  // FETCH USERS
  // =========================================
  const fetchUsers = useCallback(async () => {
  try {
    const users = await getUsers();

    setUsers(users);
  } catch (err) {
    console.error(
      "FAILED FETCH USERS",
      err,
    );
  }
}, []);

  // =========================================
  // FETCH USERS
  // ONLY WHEN MODAL OPEN
  // =========================================
  useEffect(() => {
    if (!isOpen) return;

    fetchUsers();

  }, [
    isOpen,
    fetchUsers,
    realtimeRevision,
  ]);

  // =========================================
  // FETCH CARD DETAIL
  // ONLY WHEN CARD ID CHANGED
  // =========================================
  useEffect(() => {
    if (!card?.id || !isOpen) return;

    fetchDetail();
  }, [
    card?.id,
    isOpen,
    fetchDetail,
    realtimeRevision,
  ]);

  // =========================================
  // RESET STATE WHEN MODAL CLOSED
  // =========================================
  useEffect(() => {
    if (isOpen) return;

    setDetail(null);

    setLoading(false);

  }, [isOpen]);

  return {
    detail,

    users,

    loading,

    fetchDetail,

    setDetail,
  };
}
