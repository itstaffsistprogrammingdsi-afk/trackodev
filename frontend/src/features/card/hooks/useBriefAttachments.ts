import { useCallback, useEffect, useRef, useState } from "react";

import api from "@/lib/axios";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";

import type { Attachment } from "../types";

export default function useBriefAttachments(
  cardId?: string,
  isOpen?: boolean,
  // onUpdated?: () => void,
) {
  const realtimeRevision = useRealtimeRevision(["CardBriefAttachment"]);
  const [attachments, setAttachments] =
    useState<Attachment[]>([]);

  const [loading, setLoading] =
    useState(false);
  const requestRef = useRef(0);
  const activeCardIdRef = useRef<string | null>(null);

  const fetchAttachments = useCallback(async () => {
    if (!cardId) return;
    const requestId = ++requestRef.current;
    if (activeCardIdRef.current !== cardId) {
      activeCardIdRef.current = cardId;
      setAttachments([]);
    }

    try {
      setLoading(true);

      const res = await api.get(
        `/cards/${cardId}/brief-attachments`
      );

      if (requestId === requestRef.current) {
        setAttachments(res.data.data ?? []);
      }
    } catch (err) {
      if (requestId === requestRef.current) {
        console.error("FAILED FETCH BRIEF ATTACHMENTS", err);
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    if (isOpen && cardId) {
      fetchAttachments();
    }
    return () => {
      requestRef.current += 1;
    };
  }, [cardId, fetchAttachments, isOpen, realtimeRevision]);

  return {
    attachments,
    setAttachments,
    loading,
    fetchAttachments,
  };
}
