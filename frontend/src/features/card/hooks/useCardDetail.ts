import { useCallback, useEffect, useRef, useState } from "react";

import api from "@/lib/axios";

import { Card, User } from "../types";

import { updateCard } from "../api/card.api";

interface ReturnType {
  detail: Card | null;

  users: User[];

  loading: boolean;
  saving: boolean;

  description: string;
  setDescription: React.Dispatch<React.SetStateAction<string>>;

  dueDate: string;
  setDueDate: React.Dispatch<React.SetStateAction<string>>;

  fetchDetail: () => Promise<void>;

  setDetail: React.Dispatch<React.SetStateAction<Card | null>>;
}

export function useCardDetail(
  card: Card | null,
  isOpen: boolean,
): ReturnType {
  // =========================================
  // STATE
  // =========================================
  const [detail, setDetail] = useState<Card | null>(null);

  const [users, setUsers] = useState<User[]>([]);

  const [description, setDescription] = useState("");

  const [dueDate, setDueDate] = useState("");

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  // =========================================
  // FIRST LOAD GUARD
  // =========================================
  const descriptionFirstLoad = useRef(true);

  const dueDateFirstLoad = useRef(true);

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

      const cardData: Card = cardRes.data.data;

      // DETAIL
      setDetail(cardData);

      // DESCRIPTION
      setDescription(cardData.description || "");

      // DUE DATE
      setDueDate(
        cardData.due_date
          ? new Date(cardData.due_date)
              .toISOString()
              .slice(0, 16)
          : "",
      );

      // USERS
      setUsers(userRes.data.data || []);

      // RESET FIRST LOAD
      descriptionFirstLoad.current = true;
      dueDateFirstLoad.current = true;
    } catch (err) {
      console.error("FAILED FETCH CARD DETAIL", err);
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

  // =========================================
  // AUTO SAVE DESCRIPTION
  // =========================================
  useEffect(() => {
    if (!detail) return;

    if (descriptionFirstLoad.current) {
      descriptionFirstLoad.current = false;
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSaving(true);

        await updateCard(detail.id, {
          description,
        });
      } catch (err) {
        console.error(
          "FAILED SAVE DESCRIPTION",
          err,
        );
      } finally {
        setSaving(false);
      }
    }, 700);

    return () => clearTimeout(timeout);
  }, [description]);

  // =========================================
  // AUTO SAVE DUE DATE
  // =========================================
  useEffect(() => {
    if (!detail) return;

    if (dueDateFirstLoad.current) {
      dueDateFirstLoad.current = false;
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSaving(true);

        await updateCard(detail.id, {
          due_date: dueDate,
        });
      } catch (err) {
        console.error(
          "FAILED SAVE DUE DATE",
          err,
        );
      } finally {
        setSaving(false);
      }
    }, 700);

    return () => clearTimeout(timeout);
  }, [dueDate]);

  return {
    detail,

    users,

    loading,
    saving,

    description,
    setDescription,

    dueDate,
    setDueDate,

    fetchDetail,

    setDetail,
  };
}