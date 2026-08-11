import { useCallback, useEffect, useRef, useState } from "react";

import api from "@/lib/axios";
import { getUsers } from "@/features/user/api/user.api";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import type { Card, User } from "../types";

interface ReturnType {
  detail: Card | null;
  users: User[];
  loading: boolean;
  fetchDetail: () => Promise<void>;
  setDetail: React.Dispatch<React.SetStateAction<Card | null>>;
}

export function useCardDetail(
  card: Card | null,
  isOpen: boolean,
  loadUsers: boolean,
): ReturnType {
  const realtimeRevision = useRealtimeRevision([
    "Assignment",
    "Brand",
    "Card",
    "Label",
  ]);
  const [detail, setDetail] = useState<Card | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const detailRequestRef = useRef(0);
  const usersRequestRef = useRef(0);
  const activeCardIdRef = useRef<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!card?.id || !isOpen) return;

    const requestId = ++detailRequestRef.current;
    setLoading(true);

    try {
      const cardRes = await api.get(`/cards/${card.id}`);
      if (requestId === detailRequestRef.current) {
        setDetail(cardRes.data.data);
      }
    } catch (error) {
      if (requestId === detailRequestRef.current) {
        console.error("FAILED FETCH CARD DETAIL", error);
      }
    } finally {
      if (requestId === detailRequestRef.current) setLoading(false);
    }
  }, [card?.id, isOpen]);

  useEffect(() => {
    if (!isOpen || !loadUsers) return;

    const requestId = ++usersRequestRef.current;
    void getUsers()
      .then((data) => {
        if (requestId === usersRequestRef.current) setUsers(data);
      })
      .catch((error) => {
        if (requestId === usersRequestRef.current) {
          console.error("FAILED FETCH USERS", error);
        }
      });
  }, [isOpen, loadUsers]);

  useEffect(() => {
    if (!card?.id || !isOpen) return;
    if (activeCardIdRef.current !== card.id) {
      activeCardIdRef.current = card.id;
      setDetail(null);
    }
    void fetchDetail();
    return () => {
      detailRequestRef.current += 1;
    };
  }, [card?.id, fetchDetail, isOpen, realtimeRevision]);

  useEffect(() => {
    if (isOpen) return;
    detailRequestRef.current += 1;
    usersRequestRef.current += 1;
    setDetail(null);
    activeCardIdRef.current = null;
    setLoading(false);
  }, [isOpen]);

  return { detail, users, loading, fetchDetail, setDetail };
}
