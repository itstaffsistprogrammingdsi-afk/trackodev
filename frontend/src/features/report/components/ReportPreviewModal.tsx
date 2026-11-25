import React, { useEffect, useState } from "react";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  X,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import type { ReportPreviewData } from "../types";

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
  onExportExcel: () => void;
  onRequestPdf: () => void | Promise<void>;
  previewData: ReportPreviewData | null;
  loading: boolean;
  pdfLoading: boolean;
  title?: string;
}

const isDateColumn = (column: string) =>
  /(date|tanggal|tgl|waktu)/i.test(column);

const isLongTextColumn = (column: string) =>
  /(note|catatan|label|keterangan|deskripsi|card|lampiran)/i.test(column);

const getCellTone = (value: string) => {
  if (/\bACC\b/i.test(value)) return "font-medium text-success";
  if (/\bBelum QC\b/i.test(value)) return "font-medium text-warning";
  if (/\bTerkunci\b/i.test(value)) return "font-medium text-danger";
  return "";
};

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  onDownload,
  onExportExcel,
  onRequestPdf,
  previewData,
  loading,
  pdfLoading,
  title,
}) => {
  const { can } = useAuth();
  const { t } = useLanguage();
  const resolvedTitle = title ?? t("Preview laporan", "Report preview");
  const canExportPdf = can("report.export") || can("report.export.pdf");
  const canExportExcel = can("report.export") || can("report.export.excel");
  const periodLabel = previewData?.period_label?.trim();
  const summary = previewData
    ? [
        t("{count} user", "{count} users", {
          count: previewData.users_count,
        }),
        t("{count} kartu", "{count} cards", {
          count: previewData.total_cards,
        }),
        ...(typeof previewData.total_attachments === "number"
          ? [
              t("{count} lampiran", "{count} attachments", {
                count: previewData.total_attachments,
              }),
            ]
          : []),
        ...(typeof previewData.total_qc === "number"
          ? [
              t("{count} QC", "{count} QC", {
                count: previewData.total_qc,
              }),
            ]
          : []),
      ].join(" · ")
    : "";
  const tableCaption = [resolvedTitle, periodLabel, summary]
    .filter(Boolean)
    .join(" · ");
  const [viewMode, setViewMode] = useState<"data" | "pdf">("data");

  useEffect(() => {
    if (isOpen) setViewMode("data");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const requestPdf = () => {
    setViewMode("pdf");
    if (!previewData?.pdf_base64 && !pdfLoading && !loading) {
      void onRequestPdf();
    }
  };

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
          aria-label={resolvedTitle}
          className="relative z-10 flex h-[100dvh] w-full max-w-7xl flex-col overflow-hidden border border-line bg-surface shadow-e3 sm:h-[90dvh] sm:rounded-panel"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex shrink-0 flex-col gap-3 border-b border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5">
            <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
                <FileSpreadsheet size={16} aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <h2 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-heading text-fg">
                  {resolvedTitle}
                </h2>
                {periodLabel ? (
                  <span className="max-w-[36vw] shrink-0 truncate rounded-control border border-line bg-surface-muted px-2 py-1 text-2xs font-medium text-fg-muted sm:max-w-56">
                    {periodLabel}
                  </span>
                ) : null}
              </div>
            </div>

            <div
              aria-label={t("Aksi preview laporan", "Report preview actions")}
              role="group"
              className="ml-auto flex w-full max-w-full shrink-0 flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:gap-2"
            >
              <div className="flex shrink-0 items-center gap-0.5 rounded-control border border-line bg-surface-muted/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("data")}
                  aria-pressed={viewMode === "data"}
                  aria-label={t("Tampilkan data laporan", "Show report data")}
                  className={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-[7px] px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:h-8 ${
                    viewMode === "data"
                      ? "bg-surface text-fg shadow-e1"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("Data", "Data")}
                </button>
                <button
                  type="button"
                  onClick={requestPdf}
                  disabled={loading}
                  aria-pressed={viewMode === "pdf"}
                  aria-label={t("Tampilkan PDF", "Show PDF")}
                  className={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-[7px] px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 ${
                    viewMode === "pdf"
                      ? "bg-surface text-fg shadow-e1"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  PDF
                </button>
              </div>

              <button
                type="button"
                onClick={onExportExcel}
                aria-label={t("Ekspor Excel", "Export Excel")}
                className={`${canExportExcel ? "inline-flex" : "hidden"} h-11 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:h-8`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                Excel
              </button>

              <button
                type="button"
                onClick={onDownload}
                aria-label={t("Unduh PDF", "Download PDF")}
                className={`${canExportPdf ? "inline-flex" : "hidden"} h-11 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-control bg-accent px-2.5 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:h-8`}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {t("Unduh PDF", "Download PDF")}
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label={t("Tutup preview laporan", "Close report preview")}
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:h-8 sm:w-8"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-surface-muted/50">
            {loading ? (
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
                  {t("Menyiapkan preview…", "Preparing preview…")}
                </p>
              </div>
            ) : previewData ? (
              viewMode === "pdf" ? (
                previewData.pdf_base64 ? (
                  <iframe
                    width="1200"
                    height="800"
                    className="h-full w-full border-0 bg-white"
                    src={`data:application/pdf;base64,${previewData.pdf_base64}`}
                    title={t("Pratinjau dokumen PDF", "PDF report preview")}
                    aria-label={t("Pratinjau dokumen PDF", "PDF report preview")}
                  />
                ) : pdfLoading ? (
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
                      {t("Menyiapkan PDF…", "Preparing PDF…")}
                    </p>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center px-4">
                    <div className="max-w-sm text-center">
                      <FileText
                        className="mx-auto mb-3 h-5 w-5 text-fg-subtle"
                        aria-hidden="true"
                      />
                      <p className="text-sm font-medium text-fg">
                        {t("PDF belum tersedia", "PDF is not available yet")}
                      </p>
                      <p className="mt-1 text-xs text-fg-muted">
                        {t(
                          "Coba muat PDF lagi.",
                          "Try loading the PDF again.",
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => void onRequestPdf()}
                        className="mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:min-h-9"
                      >
                        {t("Muat ulang PDF", "Reload PDF")}
                      </button>
                    </div>
                  </div>
                )
              ) : previewData.table ? (
                <div className="h-full min-w-0 overflow-auto bg-surface-muted/40 p-3 sm:p-5">
                  <div className="w-max min-w-full overflow-hidden rounded-control border border-line bg-surface">
                    <table className="min-w-[1500px] w-full border-collapse text-xs tabular-nums text-fg">
                      <caption className="caption-top border-b border-line bg-surface px-3 py-2 text-left text-2xs text-fg-muted sm:px-4">
                        {tableCaption}
                      </caption>
                      <thead>
                        <tr>
                          {previewData.table.columns.map((column, index) => {
                            const dateColumn = isDateColumn(column);
                            const longTextColumn = isLongTextColumn(column);
                            return (
                              <th
                                key={`${column}-${index}`}
                                scope="col"
                                className={`sticky top-0 z-10 border-b border-r border-line bg-surface-muted px-2.5 py-2 text-left font-semibold text-fg ${
                                  index === 0
                                    ? "w-12 min-w-12 text-center"
                                    : dateColumn
                                      ? "whitespace-nowrap"
                                      : longTextColumn
                                        ? "max-w-60"
                                        : "whitespace-nowrap"
                                }`}
                              >
                                {column}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.table.rows.length > 0 ? (
                          previewData.table.rows.map((row, rowIndex) => (
                            <tr
                              key={rowIndex}
                              className="odd:bg-surface even:bg-surface-muted/35 hover:bg-accent-soft/40"
                            >
                              {previewData.table?.columns.map((column, columnIndex) => {
                                const value = String(row[columnIndex] ?? "");
                                const longTextColumn = isLongTextColumn(column);
                                return (
                                  <td
                                    key={`${column}-${columnIndex}`}
                                    className={`border-b border-r border-line px-2.5 py-1.5 align-top ${
                                      columnIndex === 0
                                        ? "w-12 min-w-12 text-center"
                                        : longTextColumn
                                          ? "max-w-60 whitespace-normal break-words"
                                          : "whitespace-nowrap"
                                    }`}
                                  >
                                    <span className={getCellTone(value)}>
                                      {value}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={Math.max(previewData.table.columns.length, 1)}
                              className="px-4 py-8 text-center text-xs text-fg-muted"
                            >
                              {t(
                                "Tidak ada baris data untuk ditampilkan.",
                                "There are no data rows to display.",
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center px-4">
                  <div className="max-w-md text-center">
                    <FileSpreadsheet
                      className="mx-auto mb-3 h-5 w-5 text-fg-subtle"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-fg">
                      {t("Data tabel belum tersedia", "Table data is not available")}
                    </p>
                    <p className="mt-1 text-xs text-fg-muted">
                      {t(
                        "Server belum menyediakan data spreadsheet untuk preview ini.",
                        "The server does not provide spreadsheet data for this preview yet.",
                      )}
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center px-4">
                <div className="max-w-sm text-center">
                  <FileText
                    className="mx-auto mb-3 h-5 w-5 text-fg-subtle"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium text-fg">
                    {t("Preview belum tersedia", "Report preview unavailable")}
                  </p>
                  <p className="mt-1 text-xs text-fg-muted">
                    {t(
                      "Belum ada data laporan untuk ditampilkan.",
                      "There is no report data to display yet.",
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-line bg-surface px-4 py-2.5 sm:px-5">
            <p className="text-2xs text-fg-subtle">
              {t(
                "Data mengikuti sheet Excel. PDF dibuat saat tab PDF dibuka.",
                "Data mirrors the Excel sheet. PDF is generated when the PDF tab is opened.",
              )}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};
