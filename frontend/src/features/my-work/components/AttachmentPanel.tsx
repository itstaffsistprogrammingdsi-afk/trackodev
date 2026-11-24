import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { getMyAttachments } from "../api/myWork.api";
import DatePickerField from "./DatePickerField";
import type {
  AttachmentItem,
  ExportPeriodType,
} from "../types";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import { useLanguage } from "@/context/LanguageContext";

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i).reverse();

const PERIOD_OPTIONS: { key: ExportPeriodType; label: string; labelEn: string }[] = [
  { key: "daily", label: "Harian", labelEn: "Daily" },
  { key: "monthly", label: "Bulanan", labelEn: "Monthly" },
  { key: "yearly", label: "Tahunan", labelEn: "Yearly" },
];

// Helper: format Date -> "YYYY-MM-DD" (aman dari geseran timezone ala toISOString)
const toDateInputValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function AttachmentPanel() {
  const { t, locale } = useLanguage();
  const now = new Date();

  // Filter periode, persis pola yang sama dengan ExportLogPanel
  const [type, setType] = useState<ExportPeriodType>("daily");
  const [selectedDate, setSelectedDate] = useState<string>(toDateInputValue(now));
  const [startDate, setStartDate] = useState(
    toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
  );
  const [endDate, setEndDate] = useState(
    toDateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  );
  const [year, setYear] = useState(now.getFullYear());

  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [summary, setSummary] = useState({
    uploaded_files: 0,
    uploaded_links: 0,
    total_storage_used_mb: 0,
  });
  const [periodLabel, setPeriodLabel] = useState<string | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const realtimeRevision = useRealtimeRevision(["CardAttachment"]);

  const MAX_VISIBLE = 5;
  const monthlyRangeInvalid = type === "monthly" && startDate > endDate;

  useEffect(() => {
    let cancelled = false;

    if (monthlyRangeInvalid) {
      setError(null);
      setLoading(false);
      setAttachments([]);
      setSummary({
        uploaded_files: 0,
        uploaded_links: 0,
        total_storage_used_mb: 0,
      });
      setPeriodLabel(null);
      setExpanded(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await getMyAttachments({
          type,
          ...(type === "daily" ? { date: selectedDate } : {}),
          ...(type === "monthly" ? { start_date: startDate, end_date: endDate } : {}),
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
        if (!cancelled) setError(t("Gagal memuat attachment untuk periode ini.", "Failed to load attachments for this period."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [
    type,
    selectedDate,
    startDate,
    endDate,
    year,
    monthlyRangeInvalid,
    realtimeRevision,
  ]);

  const visibleAttachments = expanded
    ? attachments
    : attachments.slice(0, MAX_VISIBLE);

  return (
    <div className="rounded-panel border border-line bg-surface">

      {/* HEADER */}
      <div className="border-b border-line p-5">
        <h2 className="text-base font-semibold text-fg">
          {t("Attachments")}
        </h2>

        <p className="text-xs text-fg-subtle mt-1">
          {periodLabel
            ? t("Periode: {period}", "Period: {period}", { period: periodLabel })
            : t("Pelacakan file, link, dan upload", "Files, links, uploads tracking")}
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
                    ? "bg-accent text-accent-fg border-accent shadow-e1"
                    : "bg-surface text-fg-muted border-line hover:bg-surface-muted/50"
                }
              `}
            >
              {t(opt.label, opt.labelEn)}
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
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="attachment-start-date" className="mb-1 block text-xs text-fg-subtle">
                {t("Tanggal Awal", "Start date")}
              </label>
              <DatePickerField
                id="attachment-start-date"
                value={startDate}
                onChange={setStartDate}
              />
            </div>

            <div>
              <label htmlFor="attachment-end-date" className="mb-1 block text-xs text-fg-subtle">
                {t("Tanggal Akhir", "End date")}
              </label>
              <DatePickerField
                id="attachment-end-date"
                value={endDate}
                onChange={setEndDate}
                align="right"
              />
            </div>
          </div>
        )}

        {monthlyRangeInvalid && (
          <p className="mt-2 text-xs text-danger">
            {t("Tanggal akhir tidak boleh lebih awal dari tanggal awal.", "The end date cannot be earlier than the start date.")}
          </p>
        )}

        {type === "yearly" && (
          <div className="mt-3">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-control border border-line bg-surface px-3 py-2 text-sm cursor-pointer hover:border-accent/30 focus:outline-none focus:ring-2 focus:ring-accent/15"
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
        <div className="mt-4 grid grid-cols-1 gap-2 xsm:grid-cols-3">
          <Stat label={t("File")} value={summary.uploaded_files} />
          <Stat label={t("Link")} value={summary.uploaded_links} />
          <Stat label={t("MB")} value={summary.total_storage_used_mb} />
        </div>
      </div>

      {/* LIST */}
      <div className="p-5 space-y-3">

        {monthlyRangeInvalid ? (
          <div className="rounded-control border border-danger/20 bg-danger-soft px-4 py-6 text-center">
            <p className="text-sm font-medium text-danger">{t("Rentang tanggal belum valid", "Date range is not valid yet")}</p>
            <p className="mt-1 text-xs text-danger">{t("Perbaiki tanggal untuk menampilkan attachment.", "Fix the dates to show attachments.")}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-fg-subtle">
            <Loader2 size={16} className="animate-spin" />
            {t("Memuat attachment...", "Loading attachments...")}
          </div>
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-fg-subtle">
            {t("Tidak ada attachment untuk periode ini", "No attachments for this period")}
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
                  rounded-control border border-line
                  p-3 min-h-[92px]
                  hover:bg-surface-muted/50 transition
                "
              >

                {/* LEFT */}
                <div className="flex min-w-0 items-center gap-3 h-full">

                  <FilePreview
                    url={attachment.file_url}
                    type={attachment.attachment_type}
                  />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">
                      {attachment.file_name ?? t("File tanpa judul", "Untitled file")}
                    </p>

                    <p className="truncate text-xs text-fg-subtle">
                      {attachment.card_title ?? t("Tidak ada card terkait", "No related card")}
                    </p>

                    <p className="text-2xs text-fg-subtle leading-none mt-1">
                      {t("Diunggah: {date}", "Uploaded: {date}", { date: formatDate(attachment.created_at, locale) })}
                    </p>
                  </div>

                </div>

                {/* RIGHT */}
                <div className="flex shrink-0 flex-col items-end leading-tight">
                  <p className="text-sm font-medium text-fg-muted whitespace-nowrap">
                    {(attachment.file_size_kb ?? 0).toFixed(1)} KB
                  </p>

                  <span className="text-xs text-fg-subtle">
                    {attachment.attachment_type === "file" ? t("File") : t("Link")}
                  </span>
                </div>

              </a>
            ))}

            {/* TOGGLE */}
            {attachments.length > MAX_VISIBLE && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-sm font-medium text-accent hover:text-accent-strong"
                >
                  {expanded
                    ? t("Tampilkan lebih sedikit", "Show less")
                    : t("Tampilkan lebih banyak ({count})", "Show more ({count})", { count: attachments.length - MAX_VISIBLE })}
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
    <div className="rounded-control border border-line p-2 text-center min-h-[54px] flex flex-col justify-center">
      <p className="text-2xs text-fg-subtle">{label}</p>
      <p className="text-base font-semibold text-fg">{value}</p>
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
  const { t } = useLanguage();
  const isImage =
    type?.includes("image") ||
    url?.match(/\.(jpg|jpeg|png|webp|gif)$/i);

  if (isImage && url) {
    return (
      <img
        src={url}
        alt={t("Pratinjau", "Preview")}
        className="h-10 w-10 rounded-control object-cover border border-line shrink-0"
      />
    );
  }

  return (
    <div className="h-10 w-10 flex items-center justify-center rounded-control border border-line bg-surface-muted/50 text-fg-subtle text-xs shrink-0">
      📎
    </div>
  );
}

/* =========================
   FORMAT DATE
========================= */
function formatDate(dateString: string, locale: string) {
  return new Date(dateString).toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
