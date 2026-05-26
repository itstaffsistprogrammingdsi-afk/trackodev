import { useEffect, useState } from "react";

import api from "@/lib/axios";

export interface Attachment {
  id: string;

  file_name?: string;

  file_path?: string;

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
  const [attachments, setAttachments] =
    useState<Attachment[]>([]);

  const [loading, setLoading] =
    useState(false);

  // =========================================
  // FETCH ATTACHMENTS
  // =========================================
  const fetchAttachments =
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

        onUpdated?.();
      } catch (err) {
        console.error(
          "FAILED FETCH ATTACHMENTS",
          err,
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