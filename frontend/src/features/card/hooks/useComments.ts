import { useEffect, useState } from "react";

import api from "@/lib/axios";

import { CardComment } from "../types";

import { addComment } from "../api/card.api";

interface ReturnType {
  comments: CardComment[];

  comment: string;
  setComment: React.Dispatch<React.SetStateAction<string>>;

  sending: boolean;

  handleAddComment: () => Promise<void>;
}

export default function useComments(
  cardId?: number | string,
  isOpen?: boolean,
): ReturnType {
  const [comments, setComments] = useState<CardComment[]>([]);

  const [comment, setComment] = useState("");

  const [sending, setSending] = useState(false);

  // =========================================
  // FETCH COMMENTS
  // =========================================
  useEffect(() => {
    const fetchComments = async () => {
      if (!cardId) return;

      try {
        const res = await api.get(`/cards/${cardId}/comments`);

        setComments(res.data.data || []);
      } catch (err) {
        console.error("FAILED FETCH COMMENTS", err);
      }
    };

    if (isOpen && cardId) {
      fetchComments();
    }
  }, [cardId, isOpen]);

  // =========================================
  // ADD COMMENT
  // =========================================
  const handleAddComment = async () => {
    if (!comment.trim() || !cardId) return;

    const temp: CardComment = {
      id: Date.now().toString(),
      content: comment,
    };

    setComments((prev) => [temp, ...prev]);

    const currentComment = comment;

    setComment("");

    try {
      setSending(true);

await addComment(String(cardId), currentComment);

      const res = await api.get(`/cards/${cardId}/comments`);

      setComments(res.data.data || []);
    } catch (err) {
      console.error("FAILED ADD COMMENT", err);

      setComments((prev) => prev.filter((c) => c.id !== temp.id));
    } finally {
      setSending(false);
    }
  };

  return {
    comments,

    comment,
    setComment,

    sending,

    handleAddComment,
  };
}