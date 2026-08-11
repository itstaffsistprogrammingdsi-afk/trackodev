import { useEffect, useRef, useState } from "react";

import api from "@/lib/axios";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import { addComment } from "../api/card.api";
import type { CardComment } from "../types";

export default function useComments(
  cardId?: number | string,
  isOpen?: boolean,
) {
  const realtimeRevision = useRealtimeRevision(["CardComment"]);
  const [comments, setComments] = useState<CardComment[]>([]);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);
  const activeCardIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !cardId) return;
    const requestId = ++requestRef.current;
    if (activeCardIdRef.current !== String(cardId)) {
      activeCardIdRef.current = String(cardId);
      setComments([]);
    }
    setError("");

    void api.get(`/cards/${cardId}/comments`)
      .then((response) => {
        if (requestId === requestRef.current) {
          setComments(response.data.data || []);
          setError("");
        }
      })
      .catch((fetchError) => {
        if (requestId === requestRef.current) {
          console.error("FAILED FETCH COMMENTS", fetchError);
          setError("Komentar gagal dimuat.");
        }
      });

    return () => {
      requestRef.current += 1;
    };
  }, [cardId, isOpen, realtimeRevision]);

  const handleAddComment = async () => {
    const content = comment.trim();
    if (!content || !cardId || sending) return;

    const temporaryId = `temp-${Date.now()}`;
    const temporaryComment: CardComment = {
      id: temporaryId,
      content,
      user: { id: "current-user", name: "You", email: "" },
    };

    setComments((current) => [temporaryComment, ...current]);
    setComment("");
    setSending(true);
    setError("");

    try {
      await addComment(String(cardId), content);
      const response = await api.get(`/cards/${cardId}/comments`);
      setComments(response.data.data || []);
    } catch (submitError) {
      console.error("FAILED ADD COMMENT", submitError);
      setComments((current) =>
        current.filter((item) => item.id !== temporaryId),
      );
      setComment((current) => current || content);
      setError("Komentar gagal dikirim. Teks Anda dipulihkan.");
    } finally {
      setSending(false);
    }
  };

  return {
    comments,
    comment,
    setComment,
    sending,
    error,
    handleAddComment,
  };
}
