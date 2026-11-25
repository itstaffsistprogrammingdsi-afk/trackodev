import React, { useEffect, useRef, useState } from "react";
import {
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
          style={{ animation: "ui-scale-in 160ms ease-out" }}
        >
          <header className="flex shrink-0 flex-col gap-3 border-b border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
                <FileText size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold tracking-heading text-fg">
                  {resolvedTitle}
                </h2>
                {previewData ? (
                  <p className="truncate text-2xs text-fg-subtle">
                    {t("{users} user · {cards} card", "{users} users · {cards} cards", {
                      users: previewData.users_count,
                      cards: previewData.total_cards,
                    })}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="ml-auto flex w-full max-w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
              <div className="flex shrink-0 items-center gap-0.5 rounded-control border border-line bg-surface-muted/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("html")}
                  aria-pressed={viewMode === "html"}
                  className={`inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-[7px] px-2.5 text-xs font-medium transition-colors ${
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
                  className={`inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-[7px] px-2.5 text-xs font-medium transition-colors ${
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
                className={`${canExportExcel ? "inline-flex" : "hidden"} h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                Excel
              </button>

              <button
                type="button"
                onClick={onDownload}
                className={`${canExportPdf ? "inline-flex" : "hidden"} h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control bg-accent px-2.5 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong`}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {t("Unduh PDF", "Download PDF")}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
                aria-label={t("Tutup preview laporan", "Close report preview")}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-hidden bg-surface-muted/40">
            {loading ? (
              <div className="flex h-full flex-col items-center justify-center">
                <Loader2
                  className="h-6 w-6 animate-spin text-accent motion-reduce:animate-none"
                  aria-hidden="true"
                />
                <p className="mt-3 text-xs text-fg-muted">
                  {t("Menyiapkan preview…", "Preparing preview…")}
                </p>
              </div>
            ) : previewData ? (
              viewMode === "pdf" ? (
                <iframe
                  ref={iframeRef}
                  className="h-full w-full border-0"
                  title={t("Preview PDF", "PDF preview")}
                />
              ) : (
                <div className="h-full overflow-auto bg-surface p-2 sm:p-4">
                  <div
                    className="mx-auto max-w-6xl"
                    dangerouslySetInnerHTML={{ __html: previewData.html }}
                    onClick={handleHtmlClick}
                  />
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center px-4">
                <p className="text-xs text-fg-muted">
                  {t("Tidak ada data untuk dipreview", "No data to preview")}
                </p>
              </div>
            )}
          </div>

          <footer className="hidden items-center justify-between gap-2 border-t border-line bg-surface px-5 py-2.5 sm:flex">
            <p className="text-2xs text-fg-subtle">
              {t("Klik nama file pada mode Detail untuk membuka preview aman di dalam modal.", "Click a file name in Detail mode to open a secure preview inside the modal.")}
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
