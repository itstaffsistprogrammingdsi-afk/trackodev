import { Users } from "lucide-react";
import { CardComment } from "../../types";

interface Props {
  comments: CardComment[];
  comment: string;
  sending: boolean;

  setComment: (value: string) => void;
  handleAddComment: () => void;
}

export default function CommentSection({
  comments,
  comment,
  sending,
  setComment,
  handleAddComment,
}: Props) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <Users size={20} className="text-gray-600" />

        <h2 className="font-semibold text-lg">Comments</h2>
      </div>

      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="bg-white rounded-xl p-4 border">
<div
  key={c.id}
  className="bg-white rounded-xl p-4 border"
>

    <div className="font-medium text-sm text-gray-900">
    {c.content}
  </div>
  
  <div className="text-xs text-gray-400">
    {c.user?.name ?? "Unknown User"}
  </div>

    <div className="text-xs text-gray-400">
    {c.created_at
      ? new Date(c.created_at).toLocaleString()
      : ""}
  </div>
</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-4">
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 h-11 rounded-xl border px-4 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleAddComment}
          disabled={sending}
          className="px-5 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </section>
  );
}