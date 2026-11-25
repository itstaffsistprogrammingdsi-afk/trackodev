// ============================================
// FILE: AttachmentSection.tsx
// ============================================

import { useEffect, useRef, useState } from "react";

import CreatableSelect from "react-select/creatable";

import api from "@/lib/axios";
import { resolveStorageUrl } from "@/lib/storageUrl";
import { saveBlobFile } from "@/lib/nativeDownload";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { toast, confirmDialog } from "@/lib/feedback";

import {
  Upload,
  Link2,
  Trash2,
  FileText,
  Loader2,
  Paperclip,
  Download,
  File,
  X,
  Camera,
  Archive,
  ChevronDown,
  CheckCircle2,
  Clock3,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

import { Attachment } from "../../types";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StylesConfig } from "node_modules/react-select/dist/declarations/src/styles";

const EMPTY_ATTACHMENTS: Attachment[] = [];

interface Props {
  attachments: Attachment[];
  archivedAttachments?: Attachment[];

  setAttachments?: React.Dispatch<React.SetStateAction<Attachment[]>>;

  loading?: boolean;

  fetchAttachments: () => Promise<void>;

  showUploader?: boolean;
  showList?: boolean;

  title?: string;

  uploadEndpoint?: string;

  deleteEndpoint?: string;

  downloadEndpoint?: string;

  supportsResultDescription?: boolean;

  requiresQuantity?: boolean;
}

export default function AttachmentSection({
  attachments,
  archivedAttachments = EMPTY_ATTACHMENTS,
  // setAttachments,
  loading,
  fetchAttachments,
  showUploader = false,
  showList = true,
  title,
  uploadEndpoint,
  deleteEndpoint,
  downloadEndpoint,
  supportsResultDescription = false,
  requiresQuantity = false,
}: Props) {
  const { can, hasRole, managesDivision } = useAuth();
  const { t, locale } = useLanguage();
  const sectionTitle = title ?? t("Lampiran", "Attachment");
  const canManageResultAttachments =
    can("attachment.delete") || can("task.update");
  const canCreateResultDescriptionTemplate =
    supportsResultDescription &&
    (managesDivision() || hasRole("super_admin"));
  const [uploading, setUploading] = useState(false);

  const [linkUrl, setLinkUrl] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [resultDescription, setResultDescription] = useState("");
  const [descriptionOptions, setDescriptionOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const MAX_FILE_SIZE = 11254 * 1024; // ≈ 10.99 MB

  type DescriptionOption = {
  value: string;
  label: string;
};

  const selectStyles: StylesConfig<DescriptionOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "36px",
    borderRadius: "10px",
    borderColor: state.isFocused
      ? "var(--tracko-accent)"
      : "var(--tracko-line)",
    backgroundColor: "var(--tracko-surface)",
    boxShadow: state.isFocused
      ? "0 0 0 3px var(--tracko-accent-soft)"
      : "none",
    transition: "border-color 150ms ease, box-shadow 150ms ease",

    "&:hover": {
      borderColor: "var(--tracko-line-strong)",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    padding: "0 8px",
  }),

  placeholder: (base) => ({
    ...base,
    color: "var(--tracko-fg-subtle)",
    fontSize: "12px",
  }),

  singleValue: (base) => ({
    ...base,
    color: "var(--tracko-fg-muted)",
    fontSize: "12px",
  }),

  input: (base) => ({
    ...base,
    color: "var(--tracko-fg)",
    fontSize: "12px",
  }),

  menu: (base) => ({
    ...base,
    borderRadius: "12px",
    overflow: "hidden",
    zIndex: 50,
    backgroundColor: "var(--tracko-surface)",
    border: "1px solid var(--tracko-line)",
    boxShadow: "var(--shadow-e2)",
  }),

  option: (base, state) => ({
    ...base,
    fontSize: "12px",
    color: state.isFocused
      ? "var(--tracko-accent-strong)"
      : "var(--tracko-fg-muted)",
    backgroundColor: state.isFocused
      ? "var(--tracko-accent-soft)"
      : "var(--tracko-surface)",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),
};

  // PREVIEW MODAL
  const [previewOpen, setPreviewOpen] = useState(false);

  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [failedThumbnailIds, setFailedThumbnailIds] = useState<Set<string>>(
    new Set(),
  );
  const previewRequestRef = useRef(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveCandidate, setArchiveCandidate] = useState<Attachment | null>(null);
  const [busyAttachmentId, setBusyAttachmentId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setVisibleCount(20);
  }, [attachments.length]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  // =========================================
  // FETCH
  // =========================================

  useEffect(() => {
    if (!supportsResultDescription) return;

    let active = true;
    setTemplatesLoading(true);

    api.get("/result-description-templates")
      .then((response) => {
        if (!active) return;

        const templates = response.data?.data ?? [];
        setDescriptionOptions(
          templates.map((template: { name: string }) => ({
            value: template.name,
            label: template.name,
          })),
        );
      })
      .catch((error) => console.error("Gagal memuat template result description:", error))
      .finally(() => active && setTemplatesLoading(false));

    return () => {
      active = false;
    };
  }, [supportsResultDescription]);
  // =========================================
  // ESC CLOSE PREVIEW
  // =========================================
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setArchiveCandidate(null);
        previewRequestRef.current += 1;
        setPreviewOpen(false);
        setPreviewUrl(null);
      }
    };

    window.addEventListener("keydown", esc);

    return () => window.removeEventListener("keydown", esc);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // =========================================
  // FORMAT SIZE
  // =========================================
  const formatSize = (bytes?: number) => {
    if (!bytes) return "-";

    const kb = bytes / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }

    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return t("Waktu tidak tersedia", "Time not available");

    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  };

  // =========================================
  // FILE URL
  // =========================================
  const getFileUrl = (attachment: Attachment) =>
    resolveStorageUrl(attachment.file_url || attachment.file_path);

  const isImage = (fileName?: string, fileType?: string) => {
    const value = (fileType || fileName || "").toLowerCase();

    return (
      value.startsWith("image/") ||
      value.endsWith(".jpg") ||
      value.endsWith(".jpeg") ||
      value.endsWith(".png") ||
      value.endsWith(".gif") ||
      value.endsWith(".webp") ||
      ["jpg", "jpeg", "png", "gif", "webp"].includes(value)
    );
  };

  const isPdf = (fileName?: string, fileType?: string) => {
    const value = (fileType || fileName || "").toLowerCase();

    return (
      value === "pdf" || value === "application/pdf" || value.endsWith(".pdf")
    );
  };

  // =========================================
  // OPEN PREVIEW
  // =========================================
  const openPreview = async (item: Attachment) => {
    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    setPreviewFile(item);
    setPreviewOpen(true);
    setPreviewUrl(null);
    setPreviewError("");
    setPreviewLoading(true);

    try {
      if (!downloadEndpoint) throw new Error(t("Endpoint preview tidak tersedia", "Preview endpoint is not available"));

      const response = await api.get(
        `${downloadEndpoint}/${item.id}/download`,
        { responseType: "blob" },
      );

      if (previewRequestRef.current !== requestId) return;

      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: item.file_type });
      setPreviewUrl(window.URL.createObjectURL(blob));
    } catch (error) {
      if (previewRequestRef.current !== requestId) return;
      console.error("Preview gagal:", error);
      setPreviewError(
        t(
          "File tidak dapat dimuat atau sudah tidak tersedia.",
          "The file could not be loaded or is no longer available.",
        ),
      );
    } finally {
      if (previewRequestRef.current === requestId) setPreviewLoading(false);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const response = await api.get(
        `${downloadEndpoint}/${attachment.id}/download`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data]);

      await saveBlobFile(
        blob,
        attachment.file_name || "attachment",
        "attachment",
      );
    } catch (error) {
      console.error("Download gagal:", error);
      toast.error(
        t(
          "Gagal mengunduh file. Silakan coba lagi.",
          "Failed to download the file. Please try again.",
        ),
      );
    }
  };

  // =========================================
  // UPLOAD FILE
  // =========================================
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("Ukuran file maksimal 10,99 MB", "Maximum file size is 10.99 MB"));
      e.target.value = "";
      return;
    }
    setSelectedFile(file);
  };

  // =========================================
  // ADD LINK
  // =========================================
  const handleSubmit = async () => {
    if (!uploadEndpoint) return;

    if (requiresQuantity && (!quantity || quantity <= 0)) {
      toast.error(t("Quantity wajib diisi", "Quantity is required"));
      return;
    }

    if (supportsResultDescription && !resultDescription.trim()) {
      toast.error(t("Result Description wajib diisi", "Result description is required"));
      return;
    }

    try {
      setUploading(true);

      // FILE
      if (selectedFile) {
        const formData = new FormData();

        formData.append("type", "file");
        formData.append("file", selectedFile);
        if (requiresQuantity) {
          formData.append("quantity", String(quantity));
        }
        if (supportsResultDescription) {
          formData.append("result_description", resultDescription);
        }

        await api.post(uploadEndpoint, formData);
      }

      // LINK
      else if (linkUrl.trim()) {
        await api.post(uploadEndpoint, {
          type: "link",
          link_url: linkUrl,
          quantity,
          ...(supportsResultDescription
            ? { result_description: resultDescription }
            : {}),
        });
      } else {
        toast.error(t("Pilih file atau isi link", "Select a file or enter a link"));
        return;
      }

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      setLinkUrl("");
      setQuantity(0);
      setResultDescription("");

      await fetchAttachments();
      setFeedback({
        type: "success",
        message: t(
          "Result berhasil diunggah dan tetap aktif.",
          "Result uploaded successfully and remains active.",
        ),
      });
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        message: t(
          "Upload belum berhasil. Periksa data lalu coba lagi.",
          "Upload failed. Check the details and try again.",
        ),
      });
    } finally {
      setUploading(false);
    }
  };

  // =========================================
  // DELETE
  // =========================================
  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({
      message: t("Hapus attachment?", "Delete attachment?"),
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.delete(`${deleteEndpoint}/${id}`);

      await fetchAttachments();
    } catch (err) {
      console.error(err);
    }
  };

  const getErrorMessage = (error: unknown, fallback: string) => {
    const responseMessage = (
      error as { response?: { data?: { message?: string } } }
    )?.response?.data?.message;

    return responseMessage || fallback;
  };

  const handleArchiveForRevision = async () => {
    if (!archiveCandidate || !deleteEndpoint) return;

    try {
      setBusyAttachmentId(archiveCandidate.id);
      const response = await api.post(
        `${deleteEndpoint}/${archiveCandidate.id}/archive`,
      );
      setArchiveCandidate(null);
      await fetchAttachments();
      setFeedback({
        type: "success",
        message: response.data?.message || t(
          "File dipindahkan ke riwayat arsip.",
          "The file was moved to archive history.",
        ),
      });
    } catch (error) {
      console.error("Gagal mengarsipkan file revisi:", error);
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          t("File belum berhasil diarsipkan.", "The file could not be archived."),
        ),
      });
    } finally {
      setBusyAttachmentId(null);
    }
  };

  const handleRestore = async (item: Attachment) => {
    if (!deleteEndpoint || !item.can_restore) return;

    try {
      setBusyAttachmentId(item.id);
      const response = await api.post(`${deleteEndpoint}/${item.id}/restore`);
      await fetchAttachments();
      setFeedback({
        type: "success",
        message: response.data?.message || t(
          "File berhasil dipulihkan.",
          "The file was restored successfully.",
        ),
      });
    } catch (error) {
      console.error("Gagal memulihkan file:", error);
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          t("File belum berhasil dipulihkan.", "The file could not be restored."),
        ),
      });
    } finally {
      setBusyAttachmentId(null);
    }
  };

  const visibleAttachments = attachments.slice(0, visibleCount);

  return (
    <>
      <section className="space-y-4">
        {/* HEADER */}

        {/* UPLOADER */}
        {showUploader && (
          <div
            className="space-y-6 rounded-card border border-line bg-surface p-4 sm:p-5"
          >
            {" "}
            {/* HEADER */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold tracking-heading text-fg">{sectionTitle}</h3>

              <p className="mt-1 text-xs leading-5 text-fg-muted">
                {t(
                  "Unggah file atau tambahkan link eksternal. Result tetap aktif sampai diarsipkan manual.",
                  "Upload a file or add an external link. Results stay active until archived manually.",
                )}
              </p>
            </div>
            <div className="space-y-3">
              {/* FILE UPLOAD */}
              <label
                className="
  group
  flex
  flex-col
  items-center
  justify-center
  gap-3
  rounded-card
  border
  border-dashed
  border-line-strong
  bg-surface-muted/40
  px-5
  py-6
  cursor-pointer
  transition-colors
  hover:border-accent/40
  hover:bg-accent-soft/40
"
              >
                <div
                  className="
    flex
    h-12
    w-12
    items-center
    justify-center
    rounded-control
    bg-surface
    text-fg-muted
    shadow-e1
  "
                >
                  <Upload size={20} />
                </div>

                <div className="text-center">
                  <p className="text-sm font-medium text-fg">
                    {t("Unggah lampiran", "Upload attachment")}
                  </p>

                  <p className="mt-1 text-xs text-fg-muted">
                    {t(
                      "Gambar, dokumen, arsip, audio, dan video hingga 10,99 MB",
                      "Images, documents, archives, audio, and video up to 10.99 MB",
                    )}
                  </p>
                </div>

                <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
              </label>
              <label className="group flex min-h-20 cursor-pointer items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface-muted/40 px-3.5 py-3 text-fg-muted transition-colors hover:border-accent/40 hover:bg-accent-soft/40 active:scale-[0.99] sm:hidden">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface text-accent shadow-e1">
                  <Camera size={19} />
                </span>
                <span>
                  <span className="block text-sm font-medium text-fg">{t("Ambil dari kamera", "Take from camera")}</span>
                  <span className="mt-0.5 block text-xs text-fg-muted">
                    {t("Foto langsung untuk lampiran", "Capture a photo for the attachment")}
                  </span>
                </span>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleUpload}
                />
              </label>
              {/* SELECTED FILE PREVIEW */}
              {selectedFile && (
                <div
                  className="
    flex
    items-center
    justify-between
    rounded-card
    border
    border-success/20
    bg-success-soft
    p-3
  "
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="
        flex
        h-9
        w-9
        items-center
        justify-center
        rounded-control
        bg-surface
        text-success
      "
                    >
                      <File size={16} />
                    </div>

                    <div>
                      <p className="text-xs font-medium text-fg">{selectedFile.name}</p>

                      <p className="text-2xs text-fg-subtle">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      if (cameraInputRef.current) cameraInputRef.current.value = "";
                    }}
                    className="
      flex
      h-8
      w-8
      items-center
      justify-center
      rounded-[7px]
      text-danger
      hover:bg-danger-soft
      "
                    aria-label={t("Hapus file yang dipilih", "Remove selected file")}
                    title={t("Hapus file yang dipilih", "Remove selected file")}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* LINK INPUT */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Link2
                    size={14}
                    className="
              pointer-events-none
              absolute
              left-2.5
              top-1/2
              -translate-y-1/2
              text-fg-subtle
            "
                    aria-hidden="true"
                  />

                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    aria-label={t("Link attachment", "Attachment link")}
                    className="
              h-9
              w-full
              rounded-control
              border
              border-line
              bg-surface
              pl-8
              pr-3
              text-xs
              text-fg
              outline-none
              placeholder:text-fg-subtle
              focus:border-accent
              focus:ring-2
              focus:ring-accent/15
            "
                  />
                </div>
              </div>

              <p className="text-2xs text-fg-subtle">
                {t("Ukuran file maksimal 10,99 MB", "Maximum file size is 10.99 MB")}
              </p>
            </div>
            {(requiresQuantity || supportsResultDescription) && (
              <div
                className={`grid grid-cols-1 gap-3 ${
                  supportsResultDescription ? "md:grid-cols-2" : ""
                }`}
              >
                {requiresQuantity && (
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    placeholder={t("Quantity")}
                    aria-label={t("Quantity")}
                    className="
                      h-9 rounded-control border border-line bg-surface px-3 text-xs text-fg
                      outline-none focus:border-accent focus:ring-2 focus:ring-accent/15
                    "
                  />
                )}

                {supportsResultDescription && (
                  <CreatableSelect
                    isClearable
                    styles={selectStyles}
                    placeholder={t("Pilih / tambah", "Select / add")}
                    options={descriptionOptions}
                    value={
                      resultDescription
                        ? {
                            value: resultDescription,
                            label: resultDescription,
                          }
                        : null
                    }
                    onChange={(newValue) =>
                      setResultDescription(newValue?.value || "")
                    }
                    isLoading={templatesLoading}
                    isValidNewOption={(inputValue) =>
                      canCreateResultDescriptionTemplate &&
                      Boolean(inputValue.trim()) &&
                      !descriptionOptions.some(
                        (option) =>
                          option.value.toLowerCase() ===
                          inputValue.trim().toLowerCase(),
                      )
                    }
                    onCreateOption={async (inputValue) => {
                      if (!canCreateResultDescriptionTemplate) return;

                      try {
                        const response = await api.post(
                          "/result-description-templates",
                          { name: inputValue.trim() },
                        );
                        const name = response.data.data.name as string;
                        const newOption = { value: name, label: name };

                        setDescriptionOptions((prev) => [...prev, newOption]);
                        setResultDescription(name);
                      } catch (error) {
                        console.error(
                          "Gagal membuat template result description:",
                          error,
                        );
                        toast.error(t("Gagal membuat template Result Description", "Failed to create result description template"));
                      }
                    }}
                    className="text-sm"
                    aria-label={t("Result Description", "Result description")}
                  />
                )}
              </div>
            )}
{(selectedFile || linkUrl.trim()) && (
  <button
    type="button"
    onClick={handleSubmit}
    disabled={uploading || (!selectedFile && !linkUrl.trim())}
    className="
      h-9
      w-full
      rounded-control
      bg-accent
      text-white
      text-sm
      font-medium
      transition
      hover:bg-accent-strong
      disabled:opacity-50
      disabled:cursor-not-allowed
    "
  >
    {uploading ? (
      <span className="flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin" />
        {t("Mengunggah...", "Uploading...")}
      </span>
    ) : (
      t("Unggah lampiran", "Upload attachment")
    )}
  </button>
)}
          </div>
        )}

        {/* LIST */}
        {/* ATTACHMENT LIST */}
        {showList ? <div className="space-y-3">
          {!loading && attachments.length > 0 && (
            <div className="flex flex-col gap-2 rounded-card border border-success/15 bg-success-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-success/20 dark:bg-success-soft">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface text-success shadow-e1 dark:bg-surface-muted">
                  <CheckCircle2 size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-fg text-fg">{t("Hasil aktif", "Active results")}</p>
                  <p className="text-xs text-fg-subtle text-fg-muted">
                    {t(
                      "Semua result aktif ditampilkan di daftar utama sampai diarsipkan manual.",
                      "All active results are shown in the main list until archived manually.",
                    )}
                  </p>
                </div>
              </div>
              <span className="w-fit rounded-full bg-surface px-3 py-1 text-xs font-semibold text-success shadow-e1 dark:bg-surface-muted text-success">
                {t("{count} hasil aktif", "{count} active results", {
                  count: attachments.length,
                })}
              </span>
            </div>
          )}
          {/* LOADING */}
          {loading && (
            <div className="space-y-2" role="status" aria-busy="true">
              <span className="sr-only">{t("Memuat lampiran", "Loading attachments")}</span>
              <Skeleton className="h-20 w-full rounded-card" />
              <Skeleton className="h-20 w-full rounded-card" />
            </div>
          )}

          {/* EMPTY */}
          {!loading && attachments.length === 0 && (
            <EmptyState
              icon={Paperclip}
              title={t("Belum ada hasil aktif", "No active results yet")}
              description={t(
                "Upload hasil baru atau buka riwayat arsip untuk melihat versi lama.",
                "Upload a new result or open archive history to view older versions.",
              )}
            />
          )}

          {/* LIST */}
          {!loading &&
            visibleAttachments.map((item) => {
              const fileUrl = getFileUrl(item);

              const clickable = item.attachment_type === "file";

              return (
                <div
                  key={item.id}
                  className="group overflow-hidden rounded-card border border-line bg-surface transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-e2"
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                    {/* ========================================= */}
                    {/* THUMBNAIL */}
                    {/* ========================================= */}
                    <div
                      onClick={() => clickable && openPreview(item)}
                      onKeyDown={(event) => {
                        if (clickable && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          void openPreview(item);
                        }
                      }}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      aria-label={clickable ? t("Preview {name}", "Preview {name}", { name: item.file_name || t("attachment", "attachment") }) : undefined}
                      className={`relative h-36 w-full shrink-0 overflow-hidden rounded-control border border-line bg-surface-muted sm:h-[76px] sm:w-[108px] ${
                        clickable ? "cursor-pointer" : ""
                      }`}
                    >
                      {/* IMAGE */}
                      {item.attachment_type === "file" &&
                        isImage(item.file_type, item.file_name) &&
                        !failedThumbnailIds.has(item.id) && (
                          <img
                            src={fileUrl}
                            alt={item.file_name}
                            loading="lazy"
                            decoding="async"
                            onError={() =>
                              setFailedThumbnailIds((current) =>
                                new Set(current).add(item.id),
                              )
                            }
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        )}

                      {/* PDF */}
                      {item.attachment_type === "file" &&
                        isPdf(item.file_type, item.file_name) && (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-red-50 text-red-600">
                            <FileText size={26} />

                            <span className="mt-1 text-[11px] font-medium text-fg-subtle">
                              PDF
                            </span>
                          </div>
                        )}

                      {/* OTHER FILE */}
                      {item.attachment_type === "file" &&
                        (!isImage(item.file_type, item.file_name) ||
                          failedThumbnailIds.has(item.id)) &&
                        !isPdf(item.file_type, item.file_name) && (
                          <div className="flex h-full w-full flex-col items-center justify-center text-fg-subtle">
                            <File size={22} />

                            <span className="mt-1 text-[10px] font-medium">
                              {t("File")}
                            </span>
                          </div>
                        )}

                      {/* LINK */}
                      {item.attachment_type === "link" && (
                        <a
                          href={item.link_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-full w-full flex-col items-center justify-center bg-accent-soft text-accent transition-colors hover:bg-accent/15"
                        >
                          <Link2 size={22} />

                          <span className="mt-1 text-[10px] font-medium">
                            {t("Link")}
                          </span>
                        </a>
                      )}
                    </div>

                    {/* ========================================= */}
                    {/* CONTENT */}
                    {/* ========================================= */}
                    <div className="min-w-0 flex-1">
                      {/* TITLE */}
                      {item.attachment_type === "link" ? (
                        <a
                          href={item.link_url}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-2 break-all text-xs font-medium text-accent hover:underline"
                        >
                          {item.link_url}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openPreview(item)}
                          className="max-w-full truncate text-left text-xs font-medium text-fg transition-colors hover:text-accent hover:underline"
                        >
                          {item.file_name}
                        </button>
                      )}

                      {/* META */}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium ${
                          item.qc_at
                            ? "bg-success-soft text-success"
                            : "bg-warning-soft text-warning"
                        }`}>
                          {item.qc_at && <CheckCircle2 size={11} />}
                          {item.qc_at ? t("ACC") : t("Menunggu ACC", "Waiting for approval")} · v{item.version ?? 1}
                        </span>
                        {/* SIZE */}
                        {item.file_size && (
                          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-2xs font-medium text-fg-muted">
                            {formatSize(item.file_size)}
                          </span>
                        )}

                        {/* TYPE */}
                        {item.file_type && (
                          <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-2xs font-medium text-fg-subtle">
                            {item.file_type}
                          </span>
                        )}

                        {/* TYPE BADGE */}
                        <span
                          className={`rounded-full px-2 py-0.5 text-2xs font-medium ${
                            item.attachment_type === "link"
                              ? "bg-accent-soft text-accent"
                              : "bg-surface-muted text-fg-muted"
                          }`}
                        >
                          {item.attachment_type === "link"
                            ? t("Tautan", "Link")
                            : t("File")}
                        </span>
                        {item.quantity !== undefined && (
                          <div className="mt-2 text-xs text-fg-muted text-fg-muted">
                            {t("Quantity:")}{" "}
                            <span className="font-semibold">
                              {item.quantity}
                            </span>
                          </div>
                        )}

                        {item.result_description && (
                          <div className="mt-1 text-sm text-fg-muted text-fg">
                            {item.result_description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ========================================= */}
                    {/* ACTION */}
                    {/* ========================================= */}
                    <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
                      {supportsResultDescription && canManageResultAttachments && (
                        <button
                          type="button"
                          onClick={() => setArchiveCandidate(item)}
                          className="flex h-8 items-center gap-1.5 rounded-[7px] px-2 text-xs font-medium text-warning transition-colors hover:bg-warning-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/30"
                          title={t("Arsipkan result", "Archive result")}
                          aria-label={t("Arsipkan {name}", "Archive {name}", {
                            name: item.file_name || item.link_url || t("attachment", "attachment"),
                          })}
                        >
                          <Archive size={16} />
                          <span className="hidden md:inline">{t("Arsipkan", "Archive")}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={t("Hapus {name}", "Delete {name}", {
                          name: item.file_name || item.link_url || t("attachment", "attachment"),
                        })}
                        onClick={() => handleDelete(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-[7px] text-danger transition-colors hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          {visibleCount < attachments.length ? (
            <button
              type="button"
              onClick={() => setVisibleCount((current) => current + 20)}
              className="w-full rounded-control border border-line py-2 text-xs font-medium text-accent transition-colors hover:bg-accent-soft"
            >
              {t("Muat {count} attachment lagi", "Load {count} more attachments", {
                count: Math.min(20, attachments.length - visibleCount),
              })}
            </button>
          ) : null}

          {!loading && archivedAttachments.length > 0 && (
            <div className="overflow-hidden rounded-card border border-line bg-surface-muted/40 dark:border-line-strong dark:bg-accent/40">
              <button
                type="button"
                onClick={() => setArchiveOpen((current) => !current)}
                aria-expanded={archiveOpen}
                className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300 dark:hover:bg-accent-strong"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface text-fg-subtle shadow-e1 dark:bg-surface-muted text-fg-muted">
                    <Archive size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-fg text-fg">{t("Riwayat arsip", "Archive history")}</span>
                    <span className="block truncate text-xs text-fg-subtle text-fg-muted">
                      {t(
                        "{count} versi lama · tersembunyi dari hasil aktif",
                        "{count} older versions · hidden from active results",
                        { count: archivedAttachments.length },
                      )}
                    </span>
                  </span>
                </span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-fg-subtle transition-transform ${archiveOpen ? "rotate-180" : ""}`}
                />
              </button>

              {archiveOpen && (
                <div className="space-y-2 border-t border-line p-3 dark:border-line-strong">
                  <div className="flex items-center gap-2 px-1 pb-1 text-xs text-fg-subtle text-fg-muted">
                    <Clock3 size={14} />
                    {t(
                      "Versi terdahulu hanya ditampilkan di riwayat ini.",
                      "Older versions are only shown in this history.",
                    )}
                  </div>
                  {archivedAttachments.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-control border border-dashed border-line-strong bg-surface p-3 sm:flex-row sm:items-center dark:border-line-strong dark:bg-surface-muted/70"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-muted text-fg-subtle dark:bg-surface-muted text-fg-muted">
                        {item.attachment_type === "link" ? <Link2 size={18} /> : <File size={18} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-fg-muted text-fg">
                          {item.file_name || item.link_url || t("Attachment")}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-subtle text-fg-muted">
                          <span className="rounded-full bg-surface-muted px-2 py-0.5 font-semibold dark:bg-surface-muted">{t("Arsip", "Archived")} · v{item.version ?? 1}</span>
                          <span>{formatDateTime(item.archived_at)}</span>
                          {item.archiver?.name && <span>{t("oleh {name}", "by {name}", { name: item.archiver.name })}</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        {item.attachment_type === "link" ? (
                          <a
                            href={item.link_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50"
                            aria-label={t("Buka link arsip", "Open archived link")}
                            title={t("Buka link", "Open link")}
                          >
                            <ExternalLink size={15} />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openPreview(item)}
                            className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                          >
                            <FileText size={15} /> {t("Preview")}
                          </button>
                        )}
                        {item.can_restore && canManageResultAttachments && (
                          <button
                            type="button"
                            onClick={() => handleRestore(item)}
                            disabled={busyAttachmentId === item.id}
                            className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-success transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
                            title={t("Pulihkan sebagai hasil aktif", "Restore as active result")}
                          >
                            {busyAttachmentId === item.id ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                            {t("Pulihkan", "Restore")}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div> : null}
      </section>

      {feedback && (
        <div
          role="status"
          className={`fixed right-4 top-4 z-[100000] flex max-w-sm items-start gap-3 rounded-card border px-4 py-3 text-sm shadow-e3 ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertTriangle size={18} className="mt-0.5 shrink-0" />}
          <span className="leading-5">{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="ml-1 rounded p-0.5 opacity-60 hover:opacity-100" aria-label={t("Tutup notifikasi", "Close notification")}>
            <X size={15} />
          </button>
        </div>
      )}

      {archiveCandidate && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-overlay p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-confirmation-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busyAttachmentId) setArchiveCandidate(null);
          }}
        >
          <div className="w-full max-w-md rounded-modal bg-surface p-5 shadow-2xl dark:bg-accent sm:p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-warning-soft text-warning dark:bg-warning-soft dark:text-warning">
                <Archive size={22} />
              </span>
              <div className="min-w-0">
                <h3 id="archive-confirmation-title" className="text-sm font-semibold text-fg">{t("Arsipkan result?", "Archive result?")}</h3>
                <p className="mt-1 truncate text-sm font-medium text-fg-muted text-fg">
                  {archiveCandidate.file_name || archiveCandidate.link_url || t("Attachment")}
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-card border border-warning/15 bg-warning-soft p-4 text-sm leading-6 text-warning dark:border-warning/20 dark:bg-warning-soft dark:text-warning">
              {t(
                "File langsung disembunyikan dari hasil aktif dan tetap aman di Riwayat arsip. Result lain tetap aktif sampai Anda mengarsipkannya secara manual.",
                "The file is immediately hidden from active results and stays safe in Archive history. Other results remain active until you archive them manually.",
              )}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setArchiveCandidate(null)}
                disabled={Boolean(busyAttachmentId)}
                className="h-9 rounded-control border border-line px-4 text-sm font-semibold text-fg-muted transition hover:bg-surface-muted/60 disabled:opacity-50 dark:border-line-strong text-fg dark:hover:bg-accent-strong"
              >
                {t("Batal", "Cancel")}
              </button>
              <button
                type="button"
                onClick={handleArchiveForRevision}
                disabled={busyAttachmentId === archiveCandidate.id}
                className="flex h-9 items-center justify-center gap-2 rounded-control bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
              >
                {busyAttachmentId === archiveCandidate.id ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                {t("Pindahkan ke arsip", "Move to archive")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================== */}
      {/* PREVIEW MODAL */}
      {/* ===================================== */}
      {previewOpen && previewFile && (
        <div
          onClick={() => {
            previewRequestRef.current += 1;
            setPreviewOpen(false);
            setPreviewUrl(null);
          }}
          className="relative mt-4 flex w-full items-center justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-6xl bg-[#1f1f1f] rounded-card overflow-hidden"
          >
            {/* HEADER */}
            <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white truncate">
                {previewFile.file_name}
              </h3>

              <div className="flex items-center gap-2">
                {/* DOWNLOAD BUTTON */}
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="w-9 h-9 rounded-control hover:bg-surface/10 text-white flex items-center justify-center"
                  title={t("Download")}
                >
                  <Download size={18} />
                </button>

                {/* CLOSE BUTTON */}
                <button
                  onClick={() => {
                    previewRequestRef.current += 1;
                    setPreviewOpen(false);
                    setPreviewUrl(null);
                  }}
                  className="w-9 h-9 rounded-control hover:bg-surface/10 text-white flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* BODY */}
            <div className="flex max-h-[85vh] min-h-80 items-center justify-center overflow-auto bg-[#111]">
              {previewLoading && (
                <div className="flex flex-col items-center gap-3 text-gray-300">
                  <Loader2 size={32} className="animate-spin" />
                  <span className="text-sm">{t("Memuat preview...", "Loading preview...")}</span>
                </div>
              )}

              {!previewLoading && previewError && (
                <div className="flex flex-col items-center px-6 text-center text-gray-300">
                  <File size={60} />
                  <p className="mt-4 text-lg font-medium">{t("Preview gagal dimuat", "Preview failed to load")}</p>
                  <p className="mt-2 text-sm text-gray-400">{previewError}</p>
                  <button
                    type="button"
                    onClick={() => handleDownload(previewFile)}
                    className="mt-5 inline-flex items-center gap-2 rounded-control bg-blue-600 px-5 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    <Download size={14} />
                    {t("Coba Download", "Try download")}
                  </button>
                </div>
              )}

              {!previewLoading &&
                !previewError &&
                previewUrl &&
                isImage(previewFile.file_type, previewFile.file_name) && (
                  <img
                    src={previewUrl}
                    alt={previewFile.file_name}
                    onError={() => {
                      setPreviewError(t("Gambar gagal ditampilkan.", "The image could not be displayed."));
                      setPreviewUrl(null);
                    }}
                    className="max-h-[82vh] max-w-full object-contain"
                  />
                )}

              {!previewLoading &&
                !previewError &&
                previewUrl &&
                isPdf(previewFile.file_type, previewFile.file_name) && (
                  <iframe
                    src={previewUrl}
                    title={previewFile.file_name || t("Preview PDF", "PDF preview")}
                    onError={() => {
                      setPreviewError(t("PDF gagal ditampilkan.", "The PDF could not be displayed."));
                      setPreviewUrl(null);
                    }}
                    className="h-[82vh] w-full bg-surface"
                  />
                )}

              {!previewLoading &&
                !previewError &&
                previewUrl &&
                !isImage(previewFile.file_type, previewFile.file_name) &&
                !isPdf(previewFile.file_type, previewFile.file_name) && (
                  <div className="flex h-[82vh] flex-col items-center justify-center text-gray-300">
                    <File size={60} />
                    <p className="mt-4 text-lg font-medium">{t("Preview tidak tersedia", "Preview not available")}</p>
                    <button
                      type="button"
                      onClick={() => handleDownload(previewFile)}
                      className="mt-5 inline-flex items-center gap-2 rounded-control bg-blue-600 px-5 py-2 text-sm text-white hover:bg-blue-700"
                    >
                      <Download size={14} />
                      {t("Download File", "Download file")}
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
