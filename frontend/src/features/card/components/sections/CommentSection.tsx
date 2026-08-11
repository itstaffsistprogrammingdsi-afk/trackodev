import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import type { CardComment } from "../../types";

interface Props {
  comments: CardComment[];
  comment: string;
  sending: boolean;
  error?: string;
  setComment: (value: string) => void;
  handleAddComment: () => void;
}

const PAGE_SIZE = 20;

export default function CommentSection({
  comments,
  comment,
  sending,
  error,
  setComment,
  handleAddComment,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [comments.length]);

  const visibleComments = comments.slice(0, visibleCount);

  return (
    <section aria-labelledby="card-comments-heading">
      <div className="mb-4 flex items-center gap-3">
        <MessageSquare size={20} className="text-slate-600 dark:text-slate-300" />
        <h2 id="card-comments-heading" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Comments
        </h2>
      </div>

      {error ? (
        <p role="alert" className="mb-3 text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {visibleComments.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <p className="whitespace-pre-wrap break-words text-sm font-medium text-slate-900 dark:text-slate-100">
              {item.content}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {item.user?.name ?? "Unknown User"}
              </span>
              <span aria-hidden="true">•</span>
              <time dateTime={item.created_at}>
                {item.created_at
                  ? new Date(item.created_at).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "Baru saja"}
              </time>
            </div>
          </article>
        ))}
      </div>

      {visibleCount < comments.length ? (
        <button
          type="button"
          onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
          className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Muat {Math.min(PAGE_SIZE, comments.length - visibleCount)} komentar lagi
        </button>
      ) : null}

      <div className="mt-4 flex gap-3">
        <input
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && comment.trim()) {
              event.preventDefault();
              handleAddComment();
            }
          }}
          aria-label="Tulis komentar"
          placeholder="Write a comment..."
          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={handleAddComment}
          disabled={sending || !comment.trim()}
          className="rounded-xl bg-blue-600 px-5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </section>
  );
}
