import { useState } from "react";
import type { ActivityResponse } from "../types";

type Props = {
  data: ActivityResponse;
};

export default function AttachmentPanel({ data }: Props) {
  const attachments = data.recent_attachments ?? [];
  const [expanded, setExpanded] = useState(false);

  const MAX_VISIBLE = 5;

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const isToday = (date: string) =>
    new Date(date).toDateString() === today.toDateString();

  const isThisMonth = (date: string) =>
    new Date(date) >= startOfMonth;

  const stats = {
    today: attachments.filter(a => isToday(a.created_at)).length,
    month: attachments.filter(a => isThisMonth(a.created_at)).length,
    all: attachments.length,
  };

  const visibleAttachments = expanded
    ? attachments
    : attachments.slice(0, MAX_VISIBLE);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">

      {/* HEADER */}
      <div className="border-b border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900">
          Attachments
        </h2>

        <p className="text-xs text-gray-500 mt-1">
          Files, links, uploads tracking
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Today" value={stats.today} />
          <Stat label="Month" value={stats.month} />
          <Stat label="Total" value={stats.all} />
        </div>
      </div>

      {/* LIST */}
      <div className="p-5 space-y-3">

        {attachments.length === 0 ? (
          <p className="text-sm text-gray-400">
            No attachments found
          </p>
        ) : (
          <>
            {visibleAttachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.file_url || attachment.link_url || "#"}
                target="_blank"
                rel="noreferrer"
                className="
                  flex items-center justify-between gap-4
                  rounded-xl border border-gray-100
                  p-3 min-h-[92px]
                  hover:bg-gray-50 transition
                "
              >

                {/* LEFT */}
                <div className="flex min-w-0 items-center gap-3 h-full">

                  <FilePreview
                    url={attachment.file_url}
                    type={attachment.attachment_type}
                  />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {attachment.file_name ?? "Untitled file"}
                    </p>

                    <p className="truncate text-xs text-gray-500">
                      {attachment.card_title ?? "No related card"}
                    </p>

                    <p className="text-[11px] text-gray-400 leading-none mt-1">
                      Uploaded: {formatDate(attachment.created_at)}
                    </p>
                  </div>

                </div>

                {/* RIGHT */}
                <div className="flex shrink-0 flex-col items-end leading-tight">
                  <p className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    {(attachment.file_size_kb ?? 0).toFixed(1)} KB
                  </p>

                  <span className="text-xs text-gray-500">
                    {attachment.attachment_type}
                  </span>
                </div>

              </a>
            ))}

            {/* TOGGLE */}
            {attachments.length > MAX_VISIBLE && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  {expanded
                    ? "Show Less"
                    : `Show More (${attachments.length - MAX_VISIBLE})`}
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

/* =========================
   STAT BOX (FIX HEIGHT SYSTEM)
========================= */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-100 p-2 text-center min-h-[54px] flex flex-col justify-center">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-base font-bold text-gray-900">{value}</p>
    </div>
  );
}

/* =========================
   FILE PREVIEW
========================= */
function FilePreview({
  url,
  type,
}: {
  url?: string | null;
  type?: string;
}) {
  const isImage =
    type?.includes("image") ||
    url?.match(/\.(jpg|jpeg|png|webp|gif)$/i);

  if (isImage && url) {
    return (
      <img
        src={url}
        alt="preview"
        className="h-10 w-10 rounded-lg object-cover border border-gray-200 shrink-0"
      />
    );
  }

  return (
    <div className="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-xs shrink-0">
      📎
    </div>
  );
}

/* =========================
   FORMAT DATE
========================= */
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}