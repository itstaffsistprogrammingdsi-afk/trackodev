import { useEffect, useRef, useState } from "react";

import { Card } from "../types";

import { updateCard } from "../api/card.api";

interface ReturnType {
  description: string;
  setDescription: React.Dispatch<React.SetStateAction<string>>;

  dueDate: string;
  setDueDate: React.Dispatch<React.SetStateAction<string>>;

  saving: boolean;
}

export default function useCardDescription(
  detail: Card | null,
): ReturnType {
  const [description, setDescription] = useState("");

  const [dueDate, setDueDate] = useState("");

  const [saving, setSaving] = useState(false);

  const firstLoad = useRef(true);

  // =========================================
  // SET INITIAL VALUE
  // =========================================
  useEffect(() => {
    if (!detail) return;

    setDescription(detail.description || "");

    setDueDate(
      detail.due_date
        ? new Date(detail.due_date).toISOString().slice(0, 16)
        : "",
    );

    firstLoad.current = true;
  }, [detail]);

  // =========================================
  // AUTO SAVE DESCRIPTION
  // =========================================
  useEffect(() => {
    if (!detail) return;

    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSaving(true);

        await updateCard(detail.id, {
          description,
        });
      } catch (err) {
        console.error("FAILED SAVE DESCRIPTION", err);
      } finally {
        setSaving(false);
      }
    }, 700);

    return () => clearTimeout(timeout);
  }, [description, detail]);

  // =========================================
  // AUTO SAVE DUE DATE
  // =========================================
  useEffect(() => {
    if (!detail) return;

    if (firstLoad.current) return;

    const timeout = setTimeout(async () => {
      try {
        setSaving(true);

        await updateCard(detail.id, {
          due_date: dueDate,
        });
      } catch (err) {
        console.error("FAILED SAVE DUE DATE", err);
      } finally {
        setSaving(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [dueDate, detail]);

  return {
    description,
    setDescription,

    dueDate,
    setDueDate,

    saving,
  };
}