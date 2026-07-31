import { useCallback, useEffect, useState } from "react";

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

  const fetchAttachments = useCallback(async () => {
    if (!cardId) return;

    try {
      setLoading(true);

      const res = await api.get(
        `/cards/${cardId}/brief-attachments`
      );

      setAttachments(
        res.data.data ?? []
      );
    } catch (err) {
      console.error(
        "FAILED FETCH BRIEF ATTACHMENTS",
        err
      );
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    if (isOpen && cardId) {
      fetchAttachments();
    }
  }, [cardId, fetchAttachments, isOpen, realtimeRevision]);

  return {
    attachments,
    setAttachments,
    loading,
    fetchAttachments,
  };
}
