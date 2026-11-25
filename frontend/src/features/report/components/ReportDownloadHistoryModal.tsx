import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  History,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { reportApi } from "../api/report.api";
import type {
  ReportDownloadHistoryItem,
  ReportDownloadHistoryResponse,
} from "../types";

interface ReportDownloadHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const filterControlClass =
  "h-10 w-full rounded-control border border-line bg-surface text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15";

export const ReportDownloadHistoryModal: React.FC<
  ReportDownloadHistoryModalProps
> = ({ isOpen, onClose }) => {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<ReportDownloadHistoryItem[]>([]);
  const [meta, setMeta] = useState<ReportDownloadHistoryResponse["meta"]>({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [format, setFormat] = useState<"" | "pdf" | "xlsx">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const loadHistory = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const response = await reportApi.getDownloadHistory({
        page,
        limit: 20,
        format: format || undefined,
        search: debouncedSearch || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });

      if (currentRequest !== requestId.current) return;

      setItems(response.data ?? []);
      setMeta(response.meta);
    } catch (requestError) {
      if (currentRequest !== requestId.current) return;

      console.error("Gagal memuat riwayat download", requestError);
      setError(
        t(
          "Gagal memuat riwayat download. Silakan coba lagi.",
          "Failed to load the download history. Please try again.",
        ),
      );
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [page, format, debouncedSearch, startDate, endDate, t]);

  useEffect(() => {
    if (!isOpen) return;
    void loadHistory();
  }, [isOpen, loadHistory]);

  if (!isOpen) return null;

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setFormat("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const targetLabel = (item: ReportDownloadHistoryItem) => {
    if (!item.target_user_id) {
      return t("Batch (semua user)", "Batch (all users)");
    }

    return item.target_user_name ?? t("User tidak ditemukan", "User not found");
  };

  const hasFilters = Boolean(
    search || format || startDate || endDate,
  );

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 z-10 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("Riwayat download", "Download history")}
          className="relative z-10 flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden border border-line bg-surface shadow-e3 sm:h-[90dvh] sm:rounded-panel"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-5 sm:py-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
                <History size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold tracking-heading text-fg">
                  {t("Riwayat download", "Download history")}
                </h2>
                <p className="truncate text-2xs text-fg-muted">
                  {t(
                    "Catatan siapa yang mengunduh laporan dan kapan.",
                    "A record of who downloaded reports and when.",
                  )}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => void loadHistory()}
                disabled={loading}
                aria-label={t("Muat ulang riwayat", "Reload history")}
                title={t("Muat ulang riwayat", "Reload history")}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("Tutup riwayat download", "Close download history")}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:h-8 sm:w-8"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="shrink-0 border-b border-line bg-surface px-4 py-3 sm:px-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2">
                <label htmlFor="download-history-search" className="sr-only">
                  {t("Cari riwayat download", "Search download history")}
                </label>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
                />
                <input
                  id="download-history-search"
                  type="search"
                  autoComplete="off"
                  placeholder={t(
                    "Cari nama pengunduh atau target laporan",
                    "Search downloader or report target",
                  )}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={`${filterControlClass} pl-10`}
                />
              </div>

              <div>
                <label htmlFor="download-history-format" className="sr-only">
                  {t("Format file", "File format")}
                </label>
                <select
                  id="download-history-format"
                  value={format}
                  onChange={(event) => {
                    setFormat(event.target.value as "" | "pdf" | "xlsx");
                    setPage(1);
                  }}
                  className={`${filterControlClass} cursor-pointer px-3`}
                >
                  <option value="">{t("Semua format", "All formats")}</option>
                  <option value="pdf">PDF</option>
                  <option value="xlsx">Excel</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p aria-live="polite" className="text-xs text-fg-muted">
                  {t("{count} unduhan", "{count} downloads", {
                    count: meta.total.toLocaleString(locale),
                  })}
                </p>
                {hasFilters ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="h-8 shrink-0 rounded-control border border-line bg-surface px-2.5 text-2xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                  >
                    {t("Reset", "Reset")}
                  </button>
                ) : null}
              </div>

              <div>
                <label htmlFor="download-history-start" className="sr-only">
                  {t("Tanggal mulai", "Start date")}
                </label>
                <input
                  id="download-history-start"
                  type="date"
                  aria-label={t("Tanggal mulai", "Start date")}
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setPage(1);
                  }}
                  className={`${filterControlClass} cursor-pointer px-3`}
                />
              </div>

              <div>
                <label htmlFor="download-history-end" className="sr-only">
                  {t("Tanggal akhir", "End date")}
                </label>
                <input
                  id="download-history-end"
                  type="date"
                  aria-label={t("Tanggal akhir", "End date")}
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setPage(1);
                  }}
                  className={`${filterControlClass} cursor-pointer px-3`}
                />
              </div>
            </div>
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-auto bg-surface-muted/40 p-3 sm:p-5">
            {error ? (
              <div
                role="alert"
                className="flex flex-col items-center justify-center gap-3 rounded-card border border-danger/20 bg-danger-soft px-4 py-10 text-center"
              >
                <p className="text-sm font-medium text-danger">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadHistory()}
                  className="h-9 rounded-control border border-danger/25 bg-surface px-3 text-xs font-medium text-danger transition-colors hover:bg-danger-soft"
                >
                  {t("Coba lagi", "Try again")}
                </button>
              </div>
            ) : loading && items.length === 0 ? (
              <div
                role="status"
                aria-live="polite"
                className="flex h-full flex-col items-center justify-center gap-2"
              >
                <Loader2
                  className="h-5 w-5 animate-spin text-accent motion-reduce:animate-none"
                  aria-hidden="true"
                />
                <p className="text-xs text-fg-muted">
                  {t("Memuat riwayat…", "Loading history…")}
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                <History
                  className="h-5 w-5 text-fg-subtle"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-fg">
                  {t("Belum ada riwayat download", "No downloads yet")}
                </p>
                <p className="max-w-sm text-xs text-fg-muted">
                  {hasFilters
                    ? t(
                        "Tidak ada unduhan yang cocok dengan filter ini.",
                        "No downloads match these filters.",
                      )
                    : t(
                        "Setiap laporan yang diunduh akan tercatat di sini.",
                        "Every downloaded report will be recorded here.",
                      )}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-control border border-line bg-surface">
                <table className="w-full min-w-[980px] border-collapse text-xs text-fg">
                  <caption className="sr-only">
                    {t("Riwayat download laporan", "Report download history")}
                  </caption>
                  <thead>
                    <tr>
                      {[
                        t("Waktu", "Time"),
                        t("Diunduh oleh", "Downloaded by"),
                        t("Format", "Format"),
                        t("Target laporan", "Report target"),
                        t("Periode", "Period"),
                        t("Kartu", "Cards"),
                        t("IP", "IP"),
                      ].map((column) => (
                        <th
                          key={column}
                          scope="col"
                          className="sticky top-0 z-10 border-b border-r border-line bg-surface-muted px-3 py-2 text-left font-semibold last:border-r-0"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="odd:bg-surface even:bg-surface-muted/35 hover:bg-accent-soft/40"
                      >
                        <td className="whitespace-nowrap border-b border-r border-line px-3 py-2 tabular-nums">
                          {formatDateTime(item.created_at)}
                        </td>
                        <td className="border-b border-r border-line px-3 py-2">
                          <span className="font-medium">
                            {item.user?.name ??
                              t("User dihapus", "Deleted user")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap border-b border-r border-line px-3 py-2">
                          {item.format === "pdf" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-danger/20 bg-danger-soft px-2 py-0.5 text-2xs font-medium text-danger">
                              <FileText className="h-3 w-3" aria-hidden="true" />
                              PDF
                            </span>
                          ) : item.format === "xlsx" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success-soft px-2 py-0.5 text-2xs font-medium text-success">
                              <FileSpreadsheet
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              Excel
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="border-b border-r border-line px-3 py-2">
                          {targetLabel(item)}
                        </td>
                        <td className="border-b border-r border-line px-3 py-2 text-fg-muted">
                          {item.period_label ?? "-"}
                        </td>
                        <td className="border-b border-r border-line px-3 py-2 text-right tabular-nums">
                          {typeof item.total_cards === "number"
                            ? item.total_cards.toLocaleString(locale)
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap border-b border-line px-3 py-2 tabular-nums text-fg-muted">
                          {item.ip_address ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <footer className="flex shrink-0 flex-col gap-2 border-t border-line bg-surface px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-2xs text-fg-subtle">
              {t(
                "Hanya unduhan yang berhasil yang dicatat.",
                "Only successful downloads are recorded.",
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex h-9 items-center gap-1 rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                {t("Sebelumnya", "Previous")}
              </button>
              <span className="inline-flex h-9 items-center rounded-control bg-accent-soft px-3 text-xs font-medium text-accent tabular-nums">
                {meta.current_page} / {Math.max(meta.last_page, 1)}
              </span>
              <button
                type="button"
                disabled={page >= meta.last_page || loading}
                onClick={() =>
                  setPage((current) => Math.min(meta.last_page, current + 1))
                }
                className="inline-flex h-9 items-center gap-1 rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("Selanjutnya", "Next")}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
