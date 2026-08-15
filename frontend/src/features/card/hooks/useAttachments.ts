import { useCallback, useEffect, useRef, useState } from "react";

import api from "@/lib/axios";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import type { Attachment } from "../types";

export default function useAttachments(
  cardId?: string,
  isOpen?: boolean,
) {
  const realtimeRevision = useRealtimeRevision(["CardAttachment"]);
  const [attachments, setAttachments] =
    useState<Attachment[]>([]);
  const [archivedAttachments, setArchivedAttachments] =
    useState<Attachment[]>([]);

  const [loading, setLoading] =
    useState(false);
  const requestRef = useRef(0);
  const activeCardIdRef = useRef<string | null>(null);

  // =========================================
  // FETCH ATTACHMENTS
  // =========================================
  const fetchAttachments = useCallback(
    async () => {
      if (!cardId) return;
      const requestId = ++requestRef.current;
      if (activeCardIdRef.current !== cardId) {
        activeCardIdRef.current = cardId;
        setAttachments([]);
        setArchivedAttachments([]);
      }

      try {
        setLoading(true);

        const res = await api.get(
          `/cards/${cardId}/attachments`,
        );

        if (requestId === requestRef.current) {
          setAttachments(res.data.data || []);
          setArchivedAttachments(res.data.archived || []);
        }
      } catch (err) {
        if (requestId === requestRef.current) {
          console.error("FAILED FETCH ATTACHMENTS", err);
        }
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [cardId],
  );

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
    archivedAttachments,

    setAttachments,

    loading,

    fetchAttachments,
  };
}
