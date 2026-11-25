import React, { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  X,
} from "lucide-react";

import {
  AttachmentPreviewModal,
  type ReportAttachmentPreview,
} from "./AttachmentPreviewModal";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
  onExportExcel: () => void;
  previewData: {
    html: string;
    pdf_base64: string;
    users_count: number;
    total_cards: number;
    period_label?: string;
    total_attachments?: number;
    total_qc?: number;
  } | null;
  loading: boolean;
  title?: string;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  onDownload,
  onExportExcel,
  previewData,
  loading,
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
  const [viewMode, setViewMode] = useState<"html" | "pdf">("html");
  const [previewAttachment, setPreviewAttachment] =
    useState<ReportAttachmentPreview | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen && previewData?.pdf_base64 && viewMode === "pdf") {
      const iframe = iframeRef.current;
      if (iframe) {
        iframe.src = `data:application/pdf;base64,${previewData.pdf_base64}`;
      }
    }
  }, [isOpen, previewData, viewMode]);

  useEffect(() => {
    if (!isOpen) setPreviewAttachment(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleHtmlClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest<HTMLAnchorElement>(
      '[data-attachment-preview="true"]',
    );
    if (!link) return;

    event.preventDefault();
    event.stopPropagation();

    const url = link.dataset.attachmentUrl;
    if (!url) return;

    setPreviewAttachment({
      name:
        link.dataset.attachmentName ||
        link.textContent?.trim() ||
        t("Lampiran", "Attachment"),
      url,
      fileType: link.dataset.attachmentFileType,
    });
  };

  if (!isOpen) return null;

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
                <FileText size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-heading text-fg">
                    {resolvedTitle}
                  </h2>
                  {periodLabel ? (
                    <span className="inline-flex max-w-[36vw] shrink-0 items-center gap-1 rounded-control border border-line bg-surface-muted px-2 py-1 text-2xs font-medium text-fg-muted sm:max-w-56">
                      <CalendarDays
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">{periodLabel}</span>
                    </span>
                  ) : null}
                </div>
                {previewData ? (
                  <p className="truncate text-2xs text-fg-subtle">
                    {summary}
                  </p>
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
                  onClick={() => setViewMode("html")}
                  aria-pressed={viewMode === "html"}
                  aria-label={t("Tampilkan detail laporan", "Show report details")}
                  className={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-[7px] px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:h-8 ${
                    viewMode === "html"
                      ? "bg-surface text-fg shadow-e1"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("Detail")}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("pdf")}
                  aria-pressed={viewMode === "pdf"}
                  aria-label={t("Tampilkan PDF", "Show PDF")}
                  className={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-[7px] px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:h-8 ${
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

          <div className="min-h-0 flex-1 overflow-hidden bg-surface-muted/50">
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
                <iframe
                  ref={iframeRef}
                  className="h-full w-full border-0 bg-white"
                  title={t("Pratinjau dokumen PDF", "PDF report preview")}
                />
              ) : (
                <div className="h-full w-full overflow-auto bg-surface-muted/50 p-3 sm:p-6">
                  <div className="report-preview-canvas relative mx-auto w-max min-w-[1120px] max-w-none overflow-hidden bg-white shadow-e2 ring-1 ring-black/5">
                    <style>{`
                      .report-preview-canvas { position: relative; overflow: hidden; }
                      .report-preview-canvas .ownership-watermark {
                        position: absolute;
                        top: 43%;
                        left: -10%;
                        width: 120%;
                      }
                      .report-preview-canvas .report-document {
                        padding: 16px 18px;
                        font-size: 9px;
                      }
                      .report-preview-canvas .report-document .doc-title {
                        font-size: 18px;
                      }
                      .report-preview-canvas .report-document .kpi-value {
                        font-size: 16px;
                      }
                      .report-preview-canvas .report-document .section-title {
                        font-size: 12px;
                      }
                      .report-preview-canvas .report-document table.data-table,
                      .report-preview-canvas .report-document table.data-table th,
                      .report-preview-canvas .report-document table.data-table td {
                        font-size: 9px;
                      }
                      .report-preview-canvas .report-document .card-desc,
                      .report-preview-canvas .report-document .divisi-list,
                      .report-preview-canvas .report-document .chip {
                        font-size: 8px;
                      }
                    `}</style>
                    <div
                      dangerouslySetInnerHTML={{ __html: previewData.html }}
                      onClick={handleHtmlClick}
                    />
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

          <footer className="hidden items-center justify-between gap-2 border-t border-line bg-surface px-5 py-2.5 sm:flex">
            <p className="text-2xs text-fg-subtle">
              {t(
                "Excel memuat Kinerja & Quality Control. Pilih lampiran di Detail untuk melihat preview.",
                "Excel includes Kinerja & Quality Control. Select an attachment in Detail to preview it.",
              )}
            </p>
          </footer>
        </div>
      </div>

      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  );
};
