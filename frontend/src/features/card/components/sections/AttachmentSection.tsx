// ============================================
// FILE: AttachmentSection.tsx
// ============================================

import { useEffect, useRef, useState } from "react";

import CreatableSelect from "react-select/creatable";

import api from "@/lib/axios";
import { resolveStorageUrl } from "@/lib/storageUrl";
import { useAuth } from "@/context/AuthContext";

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
} from "lucide-react";

import { Attachment } from "../../types";
import { StylesConfig } from "node_modules/react-select/dist/declarations/src/styles";

interface Props {
  attachments: Attachment[];

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
}

export default function AttachmentSection({
  attachments,
  // setAttachments,
  loading,
  fetchAttachments,
  showUploader = false,
  showList = true,
  title = "Attachment",
  uploadEndpoint,
  deleteEndpoint,
  downloadEndpoint,
  supportsResultDescription = false,
}: Props) {
  const { hasRole } = useAuth();
  const canCreateResultDescriptionTemplate =
    supportsResultDescription &&
    (hasRole("admin") || hasRole("super_admin"));
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
    minHeight: "44px",
    borderRadius: "12px",
    borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb",
    boxShadow: "none",
    transition: "all 150ms ease",

    "&:hover": {
      borderColor: "#3b82f6",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    padding: "0 8px",
  }),

  placeholder: (base) => ({
    ...base,
    color: "#9ca3af",
    fontSize: "14px",
  }),

  menu: (base) => ({
    ...base,
    borderRadius: "12px",
    overflow: "hidden",
    zIndex: 50,
  }),

  option: (base, state) => ({
    ...base,
    fontSize: "14px",
    backgroundColor: state.isFocused
      ? "#eff6ff"
      : "#fff",
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
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    setVisibleCount(20);
  }, [attachments.length]);

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
      if (!downloadEndpoint) throw new Error("Endpoint preview tidak tersedia");

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
      setPreviewError("File tidak dapat dimuat atau sudah tidak tersedia.");
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

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = attachment.file_name || "download";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download gagal:", error);
    }
  };

  // =========================================
  // UPLOAD FILE
  // =========================================
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert("Ukuran file maksimal 10,99 MB");
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

    if (!quantity || quantity <= 0) {
      alert("Quantity wajib diisi");
      return;
    }

    if (supportsResultDescription && !resultDescription.trim()) {
      alert("Result Description wajib diisi");
      return;
    }

    try {
      setUploading(true);

      // FILE
      if (selectedFile) {
        const formData = new FormData();

        formData.append("type", "file");
        formData.append("file", selectedFile);
        formData.append("quantity", String(quantity));
        if (supportsResultDescription) {
          formData.append("result_description", resultDescription);
        }

        await api.post(uploadEndpoint, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
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
        alert("Pilih file atau isi link");
        return;
      }

      setSelectedFile(null);
      setLinkUrl("");
      setQuantity(0);
      setResultDescription("");

      await fetchAttachments();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // =========================================
  // DELETE
  // =========================================
  const handleDelete = async (id: string) => {
    const ok = confirm("Hapus attachment?");

    if (!ok) return;

    try {
      await api.delete(`${deleteEndpoint}/${id}`);

      await fetchAttachments();
    } catch (err) {
      console.error(err);
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
            className="
bg-white
border
border-slate-200
rounded-3xl
p-6
shadow-sm
space-y-6
"
          >
            {" "}
            {/* HEADER */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-800">{title}</h3>

              <p className="mt-1 text-xs text-gray-500">
                Upload file atau tambahkan link external
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
  rounded-2xl
  border-2
  border-dashed
  border-slate-300
  bg-slate-50
  px-6
  py-8
  cursor-pointer
  transition-all
  hover:border-blue-500
  hover:bg-blue-50
"
              >
                <div
                  className="
    flex
    h-12
    w-12
    items-center
    justify-center
    rounded-2xl
    bg-white
    shadow-sm
  "
                >
                  <Upload size={22} />
                </div>

                <div className="text-center">
                  <p className="font-medium text-slate-800">
                    Upload Attachment
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    Gambar, dokumen, arsip, audio, dan video hingga 10,99 MB
                  </p>
                </div>

                <input type="file" className="hidden" onChange={handleUpload} />
              </label>
              <label className="group flex min-h-24 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-3 text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 active:scale-[0.99] sm:hidden">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Camera size={21} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Ambil dari Kamera</span>
                  <span className="mt-0.5 block text-xs text-blue-600/80">
                    Foto langsung untuk attachment
                  </span>
                </span>
                <input
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
    rounded-2xl
    border
    border-emerald-200
    bg-emerald-50
    p-4
  "
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="
        h-10
        w-10
        rounded-xl
        bg-white
        flex
        items-center
        justify-center
      "
                    >
                      <File size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-medium">{selectedFile.name}</p>

                      <p className="text-xs text-slate-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="
      h-8
      w-8
      rounded-lg
      hover:bg-red-100
      text-red-500
      "
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* LINK INPUT */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Link2
                    size={16}
                    className="
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              text-gray-400
            "
                  />

                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="
              h-11
              w-full
              rounded-xl
              border
              border-gray-200
              bg-white
              pl-10
              pr-4
              text-sm
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
            "
                  />
                </div>
              </div>

              <p className="text-xs text-red-400">
                File yang diunggah harus berukuran maksimal 10,99 MB
              </p>
            </div>
            <div
              className={`grid grid-cols-1 gap-3 ${
                supportsResultDescription ? "md:grid-cols-2" : ""
              }`}
            >
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="Quantity"
                className="
      h-11
      rounded-xl
      border
      border-gray-200
      px-4
      text-sm
      focus:outline-none
      focus:ring-2
      focus:ring-blue-500
    "
              />

{supportsResultDescription && <CreatableSelect
  isClearable
  styles={selectStyles}
  placeholder="Pilih / tambah"
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
      (option) => option.value.toLowerCase() === inputValue.trim().toLowerCase(),
    )
  }
  onCreateOption={async (inputValue) => {
    if (!canCreateResultDescriptionTemplate) return;

    try {
      const response = await api.post("/result-description-templates", {
        name: inputValue.trim(),
      });
      const name = response.data.data.name as string;
      const newOption = { value: name, label: name };

      setDescriptionOptions((prev) => [...prev, newOption]);
      setResultDescription(name);
    } catch (error) {
      console.error("Gagal membuat template result description:", error);
      alert("Gagal membuat template Result Description");
    }
  }}
  className="text-sm"
/>}
            </div>
{(selectedFile || linkUrl.trim()) && (
  <button
    type="button"
    onClick={handleSubmit}
    disabled={uploading || (!selectedFile && !linkUrl.trim())}
    className="
      h-11
      w-full
      rounded-xl
      bg-slate-900
      text-white
      text-sm
      font-medium
      transition
      hover:bg-slate-800
      disabled:opacity-50
      disabled:cursor-not-allowed
    "
  >
    {uploading ? (
      <span className="flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin" />
        Uploading...
      </span>
    ) : (
      "Upload Attachment"
    )}
  </button>
)}
          </div>
        )}

        {/* LIST */}
        {/* ATTACHMENT LIST */}
        {showList ? <div className="space-y-3">
          {/* LOADING */}
          {loading && (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-6 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
              <Loader2 size={18} className="animate-spin" />

              <span>Loading attachments...</span>
            </div>
          )}

          {/* EMPTY */}
          {!loading && attachments.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-700">
                <Paperclip size={24} />
              </div>

              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Belum ada attachment
              </h3>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Upload file atau tambahkan link
              </p>
            </div>
          )}

          {/* LIST */}
          {!loading &&
            visibleAttachments.map((item) => {
              const fileUrl = getFileUrl(item);

              const clickable = item.attachment_type === "file";

              return (
                <div
                  key={item.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600"
                >
                  <div className="flex items-start gap-4 p-4">
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
                      aria-label={clickable ? `Preview ${item.file_name || "attachment"}` : undefined}
                      className={`relative h-[84px] w-[120px] shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 ${
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

                            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide">
                              PDF
                            </span>
                          </div>
                        )}

                      {/* OTHER FILE */}
                      {item.attachment_type === "file" &&
                        (!isImage(item.file_type, item.file_name) ||
                          failedThumbnailIds.has(item.id)) &&
                        !isPdf(item.file_type, item.file_name) && (
                          <div className="flex h-full w-full flex-col items-center justify-center text-gray-500">
                            <File size={24} />

                            <span className="mt-1 text-[11px] font-medium uppercase">
                              FILE
                            </span>
                          </div>
                        )}

                      {/* LINK */}
                      {item.attachment_type === "link" && (
                        <a
                          href={item.link_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-full w-full flex-col items-center justify-center bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                        >
                          <Link2 size={24} />

                          <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide">
                            Link
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
                          className="line-clamp-2 break-all text-sm font-semibold text-blue-600 hover:underline"
                        >
                          {item.link_url}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openPreview(item)}
                          className="max-w-full truncate text-left text-sm font-semibold text-slate-800 transition hover:text-blue-600 hover:underline dark:text-slate-100"
                        >
                          {item.file_name}
                        </button>
                      )}

                      {/* META */}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {/* SIZE */}
                        {item.file_size && (
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                            {formatSize(item.file_size)}
                          </span>
                        )}

                        {/* TYPE */}
                        {item.file_type && (
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {item.file_type}
                          </span>
                        )}

                        {/* TYPE BADGE */}
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            item.attachment_type === "link"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.attachment_type}
                        </span>
                        {item.quantity !== undefined && (
                          <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                            Quantity:{" "}
                            <span className="font-semibold">
                              {item.quantity}
                            </span>
                          </div>
                        )}

                        {item.result_description && (
                          <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                            {item.result_description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ========================================= */}
                    {/* ACTION */}
                    {/* ========================================= */}
                    <button
                      type="button"
                      aria-label={`Hapus ${item.file_name || item.link_url || "attachment"}`}
                      onClick={() => handleDelete(item.id)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          {visibleCount < attachments.length ? (
            <button
              type="button"
              onClick={() => setVisibleCount((current) => current + 20)}
              className="w-full rounded-xl border border-slate-200 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-800"
            >
              Muat {Math.min(20, attachments.length - visibleCount)} attachment lagi
            </button>
          ) : null}
        </div> : null}
      </section>

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
            className="relative w-full max-w-6xl bg-[#1f1f1f] rounded-2xl overflow-hidden"
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
                  className="w-9 h-9 rounded-xl hover:bg-white/10 text-white flex items-center justify-center"
                  title="Download"
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
                  className="w-9 h-9 rounded-xl hover:bg-white/10 text-white flex items-center justify-center"
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
                  <span className="text-sm">Memuat preview...</span>
                </div>
              )}

              {!previewLoading && previewError && (
                <div className="flex flex-col items-center px-6 text-center text-gray-300">
                  <File size={60} />
                  <p className="mt-4 text-lg font-medium">Preview gagal dimuat</p>
                  <p className="mt-2 text-sm text-gray-400">{previewError}</p>
                  <button
                    type="button"
                    onClick={() => handleDownload(previewFile)}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    <Download size={14} />
                    Coba Download
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
                      setPreviewError("Gambar gagal ditampilkan.");
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
                    title={previewFile.file_name || "Preview PDF"}
                    onError={() => {
                      setPreviewError("PDF gagal ditampilkan.");
                      setPreviewUrl(null);
                    }}
                    className="h-[82vh] w-full bg-white"
                  />
                )}

              {!previewLoading &&
                !previewError &&
                previewUrl &&
                !isImage(previewFile.file_type, previewFile.file_name) &&
                !isPdf(previewFile.file_type, previewFile.file_name) && (
                  <div className="flex h-[82vh] flex-col items-center justify-center text-gray-300">
                    <File size={60} />
                    <p className="mt-4 text-lg font-medium">Preview tidak tersedia</p>
                    <button
                      type="button"
                      onClick={() => handleDownload(previewFile)}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm text-white hover:bg-blue-700"
                    >
                      <Download size={14} />
                      Download File
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
