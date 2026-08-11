import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { updateCard } from "../api/card.api";
import type { Card, UpdateCardRequest } from "../types";

interface UseCardDescriptionResult {
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
  dueDate: string;
  setDueDate: Dispatch<SetStateAction<string>>;
  saving: boolean;
  saveError: string;
  flushPendingChanges: () => Promise<boolean>;
}

export default function useCardDescription(
  detail: Card | null,
  onUpdated?: (card: Partial<Card>) => void | Promise<void>,
): UseCardDescriptionResult {
  const [description, setDescriptionState] = useState("");
  const [dueDate, setDueDateState] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const detailRef = useRef<Card | null>(detail);
  const descriptionRef = useRef("");
  const dueDateRef = useRef("");
  const descriptionDirtyRef = useRef(false);
  const dueDateDirtyRef = useRef(false);
  const saveTimerRef = useRef<globalThis.ReturnType<typeof setTimeout> | null>(null);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const mountedRef = useRef(true);
  const onUpdatedRef = useRef(onUpdated);

  useEffect(() => {
    onUpdatedRef.current = onUpdated;
  }, [onUpdated]);

  const persistDirtyFields = useCallback(async (): Promise<boolean> => {
    if (savePromiseRef.current) {
      await savePromiseRef.current;
      if (!descriptionDirtyRef.current && !dueDateDirtyRef.current) return true;
    }

    const currentDetail = detailRef.current;
    if (!currentDetail) return true;

    const payload: UpdateCardRequest = {};
    const savedDescription = descriptionRef.current;
    const savedDueDate = dueDateRef.current;

    if (descriptionDirtyRef.current) {
      payload.description = savedDescription;
      descriptionDirtyRef.current = false;
    }
    if (dueDateDirtyRef.current) {
      payload.due_date = savedDueDate || null;
      dueDateDirtyRef.current = false;
    }
    if (Object.keys(payload).length === 0) return true;

    const request = (async () => {
      if (mountedRef.current) {
        setSaving(true);
        setSaveError("");
      }

      try {
        const updated = await updateCard(currentDetail.id, payload);
        if (detailRef.current?.id === currentDetail.id) {
          detailRef.current = { ...detailRef.current, ...updated };
        }
        const changed: Partial<Card> = { id: currentDetail.id };
        if ("description" in payload) changed.description = payload.description;
        if ("due_date" in payload) changed.due_date = payload.due_date;
        await onUpdatedRef.current?.(changed);
        return true;
      } catch (error) {
        if (
          payload.description !== undefined &&
          descriptionRef.current === savedDescription
        ) {
          descriptionDirtyRef.current = true;
        }
        if (
          "due_date" in payload &&
          dueDateRef.current === savedDueDate
        ) {
          dueDateDirtyRef.current = true;
        }
        console.error("FAILED SAVE CARD DETAILS", error);
        if (mountedRef.current) {
          setSaveError("Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.");
        }
        return false;
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    })();

    savePromiseRef.current = request;
    const result = await request;
    savePromiseRef.current = null;
    return result;
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void persistDirtyFields();
    }, 700);
  }, [persistDirtyFields]);

  const setDescription: Dispatch<SetStateAction<string>> = useCallback(
    (value) => {
      setDescriptionState((current) => {
        const next = typeof value === "function" ? value(current) : value;
        descriptionRef.current = next;
        descriptionDirtyRef.current = true;
        return next;
      });
      scheduleSave();
    },
    [scheduleSave],
  );

  const setDueDate: Dispatch<SetStateAction<string>> = useCallback(
    (value) => {
      setDueDateState((current) => {
        const next = typeof value === "function" ? value(current) : value;
        dueDateRef.current = next;
        dueDateDirtyRef.current = true;
        return next;
      });
      scheduleSave();
    },
    [scheduleSave],
  );

  useEffect(() => {
    if (!detail) return;

    const changedCard = detailRef.current?.id !== detail.id;
    detailRef.current = detail;

    const nextDescription = detail.description || "";
    const nextDueDate = detail.due_date
      ? detail.due_date.replace(" ", "T").slice(0, 16)
      : "";

    if (changedCard || !descriptionDirtyRef.current) {
      descriptionRef.current = nextDescription;
      descriptionDirtyRef.current = false;
      setDescriptionState(nextDescription);
    }
    if (changedCard || !dueDateDirtyRef.current) {
      dueDateRef.current = nextDueDate;
      dueDateDirtyRef.current = false;
      setDueDateState(nextDueDate);
    }
  }, [detail]);

  const flushPendingChanges = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    return persistDirtyFields();
  }, [persistDirtyFields]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (descriptionDirtyRef.current || dueDateDirtyRef.current) {
        void persistDirtyFields();
      }
    };
  }, [persistDirtyFields]);

  return {
    description,
    setDescription,
    dueDate,
    setDueDate,
    saving,
    saveError,
    flushPendingChanges,
  };
}
