import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  X,
} from "lucide-react";

import { Attachment, Card, User } from "../types";
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";
import { reportApi } from "../api/report.api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "@/lib/feedback";

interface CardDetailProps {
  selectedUser: User;
  cards: Card[];
  loading: boolean;
  onQcSubmit: (
    attachmentId: string,
    qcQuantity: number,
    qcNote: string,
  ) => Promise<boolean>;
  onClose: () => void;
  onExport?: (type: "excel" | "pdf", userId?: string | number) => void;
  onPreview?: (userId?: string | number) => void;
  exporting?: boolean;
}

export const CardDetail: React.FC<CardDetailProps> = ({
  selectedUser,
  cards,
  loading,
  onQcSubmit,
  onClose,
  onExport,
  onPreview,
  exporting = false,
}) => {
  const { can } = useAuth();
  const { t } = useLanguage();
  const canPreview = can("report.preview") || can("report.preview.pdf");
  const canExportPdf = can("report.export") || can("report.export.pdf");
  const canExportExcel = can("report.export") || can("report.export.excel");
  const canQc = can("report.qc");

  const [qcValues, setQcValues] = useState<{ [key: string]: string }>({});
  const [qcNotes, setQcNotes] = useState<{ [key: string]: string }>({});
  const [submittingQc, setSubmittingQc] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(
    null,
  );
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const openPreview = async (attachment: Attachment) => {
    if (attachment.attachment_type !== "file" || attachment.is_download_locked) return;

    setPreviewLoadingId(attachment.id);
    try {
      const blob = await reportApi.downloadAttachment(attachment.id);
      const objectUrl = URL.createObjectURL(blob);
      setPreviewObjectUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return objectUrl;
      });
      setPreviewAttachment(attachment);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err.response?.data?.message ??
          t("Gagal memuat lampiran.", "Failed to load the attachment."),
      );
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const closePreview = () => {
    setPreviewAttachment(null);
    setPreviewObjectUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  };

  const handleQcSubmit = async (attachmentId: string) => {
    const quantity = parseInt(qcValues[attachmentId] || "0");
    const note = qcNotes[attachmentId] || "";

    if (Number.isNaN(quantity) || quantity < 0) {
      toast.error(t("Jumlah QC harus berupa angka positif", "QC quantity must be a positive number"));
      return;
    }

    setSubmittingQc((previous) => ({ ...previous, [attachmentId]: true }));
    try {
      const success = await onQcSubmit(attachmentId, quantity, note);
      if (success) {
        setQcValues((previous) => ({ ...previous, [attachmentId]: "" }));
        setQcNotes((previous) => ({ ...previous, [attachmentId]: "" }));
      }
    } finally {
      setSubmittingQc((previous) => ({ ...previous, [attachmentId]: false }));
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Detail laporan {name}", "Report details {name}", { name: selectedUser.name })}
        className="absolute inset-y-0 right-0 flex w-full max-w-5xl flex-col border-l border-line bg-canvas shadow-e3"
        style={{ animation: "ui-page-in 180ms var(--ease-soft)" }}
      >
        <header className="flex flex-col gap-3 border-b border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-2xs font-medium text-fg-subtle">
              {t("Detail laporan", "Report details")}
            </p>
            <h2 className="truncate text-lg font-semibold tracking-heading text-fg">
              {selectedUser.name}
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              {t("{count} card dalam periode ini", "{count} cards in this period", { count: cards.length })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canPreview ? (
              <button
                type="button"
                onClick={() => onPreview?.(selectedUser.id)}
                className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                {t("Preview")}
              </button>
            ) : null}

            {canExportPdf ? (
              <button
                type="button"
                onClick={() => onExport?.("pdf", selectedUser.id)}
                disabled={exporting}
                className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                PDF
              </button>
            ) : null}

            {canExportExcel ? (
              <button
                type="button"
                onClick={() => onExport?.("excel", selectedUser.id)}
                disabled={exporting}
                className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-50"
              >
                <FileSpreadsheet
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
                Excel
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              aria-label={t("Tutup detail laporan", "Close report details")}
              className="flex h-8 w-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6">
          {loading ? (
            <div
              className="flex h-full items-center justify-center gap-2 text-sm text-fg-muted"
              role="status"
            >
              <Loader2
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              {t("Memuat card…", "Loading cards…")}
            </div>
          ) : cards.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-panel border border-dashed border-line bg-surface px-6 py-16 text-center">
              <FileText
                className="h-8 w-8 text-fg-subtle"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium text-fg">
                {t("Tidak ada card pada periode ini", "No cards in this period")}
              </p>
              <p className="mt-1 max-w-sm text-xs text-fg-muted">
                {t("Ubah filter periode atau pilih anggota lain untuk melihat laporan.", "Change the period filter or select another member to see the report.")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="flex items-center gap-1.5 text-2xs text-fg-subtle">
                <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                {t(
                  "File PDF hanya dapat dibuka dalam 1 bulan sejak diunggah.",
                  "PDF files can only be opened within 1 month of upload.",
                )}
              </p>
              {cards.map((card) => {
                const activeAttachments =
                  card.attachments?.filter(
                    (attachment) => !attachment.archived_at,
                  ) ?? [];

                return (
                  <article
                    key={card.id}
                    className="rounded-panel border border-line bg-surface p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold text-fg">
                          {card.title}
                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-fg-subtle">
                          {card.campaign ? (
                            <span>{card.campaign.name}</span>
                          ) : null}
                          {card.board ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{card.board.name}</span>
                            </>
                          ) : null}
                          {card.is_cross_division_copy ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-accent">
                                {t("Lintas divisi", "Cross-division")}
                                {card.source_division
                                  ? t(" dari {division}", " from {division}", {
                                      division: card.source_division.name,
                                    })
                                  : ""}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2 py-0.5 text-2xs font-medium ${
                          card.is_completed
                            ? "bg-success-soft text-success"
                            : "bg-warning-soft text-warning"
                        }`}
                      >
                        {card.is_completed ? (
                          <CheckCircle2
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                        ) : (
                          <Clock3 className="h-3 w-3" aria-hidden="true" />
                        )}
                        {card.is_completed ? t("Selesai", "Completed") : t("Berjalan", "In progress")}
                      </span>
                    </div>

                    {card.labels?.length || card.brands?.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {card.labels?.map((label) => (
                          <span
                            key={label.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2 py-0.5 text-2xs font-medium text-fg-muted"
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor:
                                  label.color || "var(--tracko-fg-subtle)",
                              }}
                            />
                            {label.name}
                          </span>
                        ))}
                        {card.brands?.map((brand) => (
                          <span
                            key={brand.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2 py-0.5 text-2xs font-medium text-fg-muted"
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor:
                                  brand.color || "var(--tracko-fg-subtle)",
                              }}
                            />
                            {brand.name}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 border-t border-line pt-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h4 className="text-2xs font-medium text-fg-subtle">
                          {t("Lampiran & QC", "Attachments & QC")}
                        </h4>
                        <span className="text-2xs tabular-nums text-fg-subtle">
                          {activeAttachments.length}
                        </span>
                      </div>

                      {activeAttachments.length > 0 ? (
                        <div className="space-y-2">
                          {activeAttachments.map((attachment) => {
                            const isQcDone =
                              attachment.qc_quantity !== null &&
                              attachment.qc_quantity !== undefined;
                            const isSubmitting =
                              submittingQc[attachment.id] || false;
                            const maxQty = attachment.quantity || 0;

                            return (
                              <div
                                key={attachment.id}
                                className={`rounded-card border p-3 ${
                                  isQcDone
                                    ? "border-success/20 bg-success-soft/40"
                                    : "border-line bg-surface-muted/40"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    {attachment.is_download_locked ? (
                                      <span
                                        className="inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-fg-subtle"
                                        title={t(
                                          "File PDF lebih dari 1 bulan tidak dapat dibuka.",
                                          "PDF files older than 1 month can no longer be opened.",
                                        )}
                                      >
                                        <Lock
                                          className="h-3 w-3 shrink-0"
                                          aria-hidden="true"
                                        />
                                        <span className="truncate">
                                          {attachment.file_name}
                                        </span>
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void openPreview(attachment)
                                        }
                                        disabled={
                                          attachment.attachment_type !==
                                            "file" ||
                                          previewLoadingId === attachment.id
                                        }
                                        className="max-w-full truncate text-left text-xs font-medium text-accent transition-colors hover:text-accent-strong disabled:cursor-default disabled:text-fg"
                                        title={
                                          attachment.attachment_type ===
                                          "file"
                                            ? t("Preview {file}", "Preview {file}", { file: attachment.file_name })
                                            : attachment.file_name
                                        }
                                      >
                                        {attachment.file_name}
                                        {previewLoadingId === attachment.id
                                          ? t(" (memuat…)", " (loading…)")
                                          : ""}
                                      </button>
                                    )}

                                    <p className="mt-1 text-2xs text-fg-subtle">
                                      {t("Jumlah {count}", "Quantity {count}", { count: maxQty })}
                                      {isQcDone ? (
                                        <>
                                          {" · "}
                                          <span className="font-medium text-success">
                                            {t("QC {quantity}", "QC {quantity}", { quantity: attachment.qc_quantity ?? 0 })}
                                          </span>
                                          {attachment.qc_user
                                            ? t(" oleh {name}", " by {name}", { name: attachment.qc_user.name })
                                            : ""}
                                        </>
                                      ) : null}
                                    </p>

                                    {attachment.qc_note ? (
                                      <p className="mt-1.5 rounded-[7px] bg-surface px-2 py-1.5 text-2xs leading-4 text-fg-muted">
                                        {attachment.qc_note}
                                      </p>
                                    ) : null}
                                  </div>

                                  {isQcDone ? (
                                    <CheckCircle2
                                      className="h-4 w-4 shrink-0 text-success"
                                      aria-label={t("QC selesai", "QC completed")}
                                    />
                                  ) : (
                                    <Clock3
                                      className="h-4 w-4 shrink-0 text-warning"
                                      aria-label={t("Menunggu QC", "Awaiting QC")}
                                    />
                                  )}
                                </div>

                                {canQc ? (
                                  <div className="mt-2.5 flex flex-col gap-2 border-t border-line pt-2.5 sm:flex-row sm:items-center">
                                    <label className="flex items-center gap-1.5 text-2xs text-fg-muted">
                                      {t("QC")}
                                      <input
                                        type="number"
                                        min="0"
                                        max={maxQty}
                                        value={
                                          qcValues[attachment.id] ?? ""
                                        }
                                        onChange={(event) => {
                                          const value = event.target.value;
                                          if (
                                            value === "" ||
                                            (!Number.isNaN(Number(value)) &&
                                              Number(value) >= 0)
                                          ) {
                                            setQcValues((previous) => ({
                                              ...previous,
                                              [attachment.id]: value,
                                            }));
                                          }
                                        }}
                                        placeholder={`0–${maxQty}`}
                                        aria-label={t("Jumlah QC {file}", "QC quantity {file}", { file: attachment.file_name })}
                                        className="h-8 w-20 rounded-[7px] border border-line bg-surface px-2 text-xs text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                                        disabled={isQcDone || isSubmitting}
                                      />
                                      <span className="text-fg-subtle">
                                        / {maxQty}
                                      </span>
                                    </label>

                                    <input
                                      type="text"
                                      value={qcNotes[attachment.id] ?? ""}
                                      onChange={(event) =>
                                        setQcNotes((previous) => ({
                                          ...previous,
                                          [attachment.id]: event.target.value,
                                        }))
                                      }
                                      placeholder={t("Catatan QC (opsional)", "QC note (optional)")}
                                      aria-label={t("Catatan QC {file}", "QC note {file}", { file: attachment.file_name })}
                                      className="h-8 min-w-0 flex-1 rounded-[7px] border border-line bg-surface px-2 text-xs text-fg outline-none placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/15"
                                      disabled={isQcDone || isSubmitting}
                                    />

                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleQcSubmit(attachment.id)
                                      }
                                      disabled={
                                        isQcDone ||
                                        isSubmitting ||
                                        !qcValues[attachment.id] ||
                                        Number(
                                          qcValues[attachment.id],
                                        ) < 0 ||
                                        Number(
                                          qcValues[attachment.id],
                                        ) > maxQty
                                      }
                                      className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[7px] bg-accent px-2.5 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle"
                                    >
                                      {isSubmitting ? (
                                        <Loader2
                                          className="h-3 w-3 animate-spin motion-reduce:animate-none"
                                          aria-hidden="true"
                                        />
                                      ) : null}
                                      {isQcDone ? t("Selesai", "Completed") : t("Kirim QC", "Submit QC")}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="rounded-card border border-dashed border-line px-3 py-4 text-center text-2xs text-fg-subtle">
                          {t("Tidak ada lampiran", "No attachments")}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AttachmentPreviewModal
        attachment={
          previewAttachment && previewObjectUrl
            ? {
                name: previewAttachment.file_name ?? t("Lampiran", "Attachment"),
                url: previewObjectUrl,
                fileType: previewAttachment.file_type,
              }
            : null
        }
        onClose={closePreview}
      />
    </div>
  );
};
