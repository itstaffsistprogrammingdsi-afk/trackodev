import { useEffect, useState } from "react";

import api from "@/lib/axios";

import type { Attachment } from "../types";

export default function useBriefAttachments(
  cardId?: string,
  isOpen?: boolean,
  // onUpdated?: () => void,
) {
  const [attachments, setAttachments] =
    useState<Attachment[]>([]);

  const [loading, setLoading] =
    useState(false);

  const fetchAttachments = async () => {
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
  };

  useEffect(() => {
    if (isOpen && cardId) {
      fetchAttachments();
    }
  }, [cardId, isOpen]);

  return {
    attachments,
    setAttachments,
    loading,
    fetchAttachments,
  };
}