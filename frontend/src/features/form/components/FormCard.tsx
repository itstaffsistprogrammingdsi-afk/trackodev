import {
  Calendar,
  Copy,
  ExternalLink,
  EyeOff,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";

import type { Form } from "../types";

type Props = {
  form: Form;

  onCopy: (slug: string) => void;
  onPublish: (form: Form) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onResponses: (id: string) => void;
};

export default function FormCard({
  form,
  onCopy,
  onPublish,
  onDelete,
  onEdit,
  onResponses,
}: Props) {
  const badgeClass = form.is_published
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <div className="group rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold text-slate-900">
              {form.name}
            </h2>

            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
              {form.description || "No description"}
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}
          >
            {form.is_published ? "Published" : "Draft"}
          </span>
        </div>


        {/* Date */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
          <Calendar size={16} />

          <span>
            {new Date(form.created_at).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-5 gap-2 border-t border-slate-100 pt-4">
          <button
            onClick={() => onCopy(form.slug)}
            title="Copy Link"
            className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
          >
            <Copy size={18} />
          </button>

          <button
            onClick={() => onResponses(form.id)}
            title="Responses"
            className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
          >
            <ExternalLink size={18} />
          </button>

          <button
            onClick={() => onEdit(form.id)}
            title="Edit"
            className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
          >
            <Pencil size={18} />
          </button>

          <button
            onClick={() => onPublish(form)}
            title={form.is_published ? "Unpublish" : "Publish"}
            className={`flex h-11 items-center justify-center rounded-xl text-white transition ${
              form.is_published
                ? "bg-orange-500 hover:bg-orange-600"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {form.is_published ? (
              <EyeOff size={18} />
            ) : (
              <Send size={18} />
            )}
          </button>

          <button
            onClick={() => onDelete(form.id)}
            title="Delete"
            className="flex h-11 items-center justify-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}