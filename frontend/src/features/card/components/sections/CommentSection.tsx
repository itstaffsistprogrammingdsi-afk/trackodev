import { useEffect, useState } from "react";
import { MessageSquare, Send } from "lucide-react";

import type { CardComment } from "../../types";
import { useLanguage } from "@/context/LanguageContext";
import { getLocale, translate } from "@/i18n/translate";

interface Props {
  comments: CardComment[];
  comment: string;
  sending: boolean;
  error?: string;
  setComment: (value: string) => void;
  handleAddComment: () => void;
}

const PAGE_SIZE = 20;

function initials(name?: string): string {
  if (!name) return "?";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatCommentTime(value?: string): string {
  if (!value) return translate("Baru saja", "Just now");

  return new Date(value).toLocaleString(getLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CommentSection({
  comments,
  comment,
  sending,
  error,
  setComment,
  handleAddComment,
}: Props) {
  const { t } = useLanguage();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [comments.length]);

  const visibleComments = comments.slice(0, visibleCount);
  const canSend = comment.trim().length > 0 && !sending;

  return (
    <section aria-labelledby="card-comments-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <MessageSquare
            size={17}
            aria-hidden="true"
            className="text-fg-subtle"
          />
          <h2
            id="card-comments-heading"
            className="text-sm font-semibold tracking-heading text-fg"
          >
            {t("Komentar", "Comments")}
          </h2>
        </div>

        {comments.length > 0 ? (
          <span className="text-2xs font-medium tabular-nums text-fg-subtle">
            {comments.length}
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mb-3 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}

      {comments.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-3 py-5 text-center text-xs text-fg-subtle">
          {t(
            "Belum ada komentar. Mulai diskusi di sini.",
            "No comments yet. Start the discussion here.",
          )}
        </p>
      ) : (
        <div className="space-y-2">
          {visibleComments.map((item) => (
            <article
              key={item.id}
              className="flex gap-2.5 rounded-card border border-line bg-surface p-3"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10px] font-semibold text-fg-muted"
              >
                {initials(item.user?.name)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs font-medium text-fg">
                    {item.user?.name ?? t("Pengguna", "User")}
                  </span>
                  <time
                    dateTime={item.created_at}
                    className="text-2xs text-fg-subtle"
                  >
                    {formatCommentTime(item.created_at)}
                  </time>
                </div>

                <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-fg-muted">
                  {item.content}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      {visibleCount < comments.length ? (
        <button
          type="button"
          onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
          className="mt-2 text-xs font-medium text-accent transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          {t(
            "Muat {count} komentar lagi",
            "Load {count} more comments",
            { count: Math.min(PAGE_SIZE, comments.length - visibleCount) },
          )}
        </button>
      ) : null}

      <div className="mt-3 rounded-card border border-line bg-surface p-2">
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && canSend) {
              event.preventDefault();
              handleAddComment();
            }
          }}
          rows={2}
          aria-label={t("Tulis komentar", "Write a comment")}
          placeholder={t(
            "Tulis komentar… Enter untuk kirim, Shift+Enter untuk baris baru",
            "Write a comment… Press Enter to send, Shift+Enter for a new line",
          )}
          className="w-full resize-none border-0 bg-transparent px-1.5 py-1 text-[13px] leading-5 text-fg outline-none placeholder:text-fg-subtle"
        />

        <div className="flex items-center justify-between gap-2 border-t border-line px-1.5 pt-2">
          <span className="text-2xs text-fg-subtle">
            {sending
              ? t("Mengirim…", "Sending…")
              : t("Shift+Enter untuk baris baru", "Shift+Enter for a new line")}
          </span>

          <button
            type="button"
            onClick={handleAddComment}
            disabled={!canSend}
            className="inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-accent px-2.5 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={13} aria-hidden="true" />
            {t("Kirim", "Send")}
          </button>
        </div>
      </div>
    </section>
  );
}
