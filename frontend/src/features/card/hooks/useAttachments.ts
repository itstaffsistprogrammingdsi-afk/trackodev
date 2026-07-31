import { useCallback, useEffect, useRef, useState } from "react";

import api from "@/lib/axios";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";

export interface Attachment {
  id: string;

  file_name?: string;

  file_path?: string;

  file_url?: string;

  file_type?: string;

  file_size?: number;

  link_url?: string;

  attachment_type: "file" | "link";
}

export default function useAttachments(
  cardId?: string,
  isOpen?: boolean,
  onUpdated?: () => void,
) {
  const realtimeRevision = useRealtimeRevision(["CardAttachment"]);
  const [attachments, setAttachments] =
    useState<Attachment[]>([]);

  const [loading, setLoading] =
    useState(false);
  const onUpdatedRef = useRef(onUpdated);

  useEffect(() => {
    onUpdatedRef.current = onUpdated;
  }, [onUpdated]);

  // =========================================
  // FETCH ATTACHMENTS
  // =========================================
  const fetchAttachments = useCallback(
    async () => {
      if (!cardId) return;

      try {
        setLoading(true);

        const res = await api.get(
          `/cards/${cardId}/attachments`,
        );

        setAttachments(
          res.data.data || [],
        );

        onUpdatedRef.current?.();
      } catch (err) {
        console.error(
          "FAILED FETCH ATTACHMENTS",
          err,
        );
      } finally {
        setLoading(false);
      }
    },
    [cardId],
  );

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
