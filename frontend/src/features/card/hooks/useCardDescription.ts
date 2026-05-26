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
  onUpdated?: (card: Partial<Card>) => void,
): ReturnType {
  // =========================================
  // STATE
  // =========================================
  const [description, setDescription] = useState("");

  const [dueDate, setDueDate] = useState("");

  const [saving, setSaving] = useState(false);

  // =========================================
  // FIRST LOAD GUARD
  // =========================================
  const descriptionFirstLoad = useRef(true);

  const dueDateFirstLoad = useRef(true);

  // =========================================
  // SET INITIAL VALUE
  // =========================================
  useEffect(() => {
    if (!detail) return;

    // DESCRIPTION
    setDescription(detail.description || "");

    // DUE DATE
setDueDate(
  detail.due_date
    ? detail.due_date
        .replace(" ", "T")
        .slice(0, 16)
    : "",
);

    // RESET FIRST LOAD
    descriptionFirstLoad.current = true;
    dueDateFirstLoad.current = true;
  }, [detail]);

  // =========================================
  // AUTO SAVE DESCRIPTION
  // =========================================
  useEffect(() => {
    if (!detail) return;

    // SKIP INITIAL RENDER
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

onUpdated?.({
  id: detail.id,
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

    // SKIP INITIAL RENDER
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

onUpdated?.({
  id: detail.id,
  due_date: dueDate,
});
      } catch (err) {
        console.error("FAILED SAVE DUE DATE", err);
      } finally {
        setSaving(false);
      }
    }, 700);

    return () => clearTimeout(timeout);
  }, [dueDate, detail]);

  // =========================================
  // RETURN
  // =========================================
  return {
    description,
    setDescription,

    dueDate,
    setDueDate,

    saving,
  };
}
