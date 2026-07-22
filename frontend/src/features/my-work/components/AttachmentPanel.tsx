import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { getMyAttachments } from "../api/myWork.api";
import DatePickerField from "./DatePickerField";
import type {
  ActivityResponse,
  AttachmentItem,
  ExportPeriodType,
} from "../types";

type Props = {
  data: ActivityResponse;
};

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i).reverse();

const PERIOD_OPTIONS: { key: ExportPeriodType; label: string }[] = [
  { key: "daily", label: "Harian" },
  { key: "monthly", label: "Bulanan" },
  { key: "yearly", label: "Tahunan" },
];

// Helper: format Date -> "YYYY-MM-DD" (aman dari geseran timezone ala toISOString)
const toDateInputValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function AttachmentPanel({ data }: Props) {
  const now = new Date();

  // Filter periode, persis pola yang sama dengan ExportLogPanel
  const [type, setType] = useState<ExportPeriodType>("daily");
  const [selectedDate, setSelectedDate] = useState<string>(toDateInputValue(now));
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  // Fallback awal: pakai recent_attachments yang sudah ada di prop `data`
  // supaya panel langsung terisi sebelum fetch periode pertama selesai.
  const [attachments, setAttachments] = useState<AttachmentItem[]>(data.recent_attachments ?? []);
  const [summary, setSummary] = useState({
    uploaded_files: data.summary.uploaded_files ?? 0,
    uploaded_links: data.summary.uploaded_links ?? 0,
    total_storage_used_mb: data.summary.total_storage_used_mb ?? 0,
  });
  const [periodLabel, setPeriodLabel] = useState<string | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_VISIBLE = 5;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await getMyAttachments({
          type,
          ...(type === "daily" ? { date: selectedDate } : {}),
          ...(type === "monthly" ? { month, year } : {}),
          ...(type === "yearly" ? { year } : {}),
          per_page: 50,
        });

        if (cancelled) return;

        setAttachments(res.attachments);
        setSummary({
          uploaded_files: res.summary.uploaded_files,
          uploaded_links: res.summary.uploaded_links,
          total_storage_used_mb: res.summary.total_storage_used_mb,
        });
        setPeriodLabel(res.filter.label);
        setExpanded(false);
      } catch {
        if (!cancelled) setError("Gagal memuat attachment untuk periode ini.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, selectedDate, month, year]);

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
          {periodLabel ? `Periode: ${periodLabel}` : "Files, links, uploads tracking"}
        </p>

        {/* PERIOD TYPE */}
        <div className="mt-4 flex gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setType(opt.key)}
              className={`
                flex-1 rounded-full px-3 py-1.5 text-xs border transition
                ${
                  type === opt.key
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* PERIOD VALUE */}
        {type === "daily" && (
          <div className="mt-3">
            <DatePickerField value={selectedDate} onChange={setSelectedDate} />
          </div>
        )}

        {type === "monthly" && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm cursor-pointer hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm cursor-pointer hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {type === "yearly" && (
          <div className="mt-3">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm cursor-pointer hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* STATS */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Files" value={summary.uploaded_files} />
          <Stat label="Links" value={summary.uploaded_links} />
          <Stat label="MB" value={summary.total_storage_used_mb} />
        </div>
      </div>

      {/* LIST */}
      <div className="p-5 space-y-3">

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            Memuat attachment...
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-gray-400">
            Tidak ada attachment untuk periode ini
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
   STAT BOX
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
