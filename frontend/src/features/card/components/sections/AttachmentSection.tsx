// ============================================attachmentsectio
// FILE: AttachmentSection.tsx
// ============================================

import { useEffect, useState } from "react";

import api from "@/lib/axios";

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
} from "lucide-react";

import { Attachment } from "../../types";

interface Props {
  attachments: Attachment[];

  setAttachments?: React.Dispatch<React.SetStateAction<Attachment[]>>;

  loading?: boolean;

  fetchAttachments: () => Promise<void>;

  showUploader?: boolean;

  title?: string;

  uploadEndpoint?: string;

  deleteEndpoint?: string;

  downloadEndpoint?: string;
}

export default function AttachmentSection({
  attachments,
  // setAttachments,
  loading,
  fetchAttachments,
  showUploader = false,
  title = "Attachment",
  uploadEndpoint,
  deleteEndpoint,
  downloadEndpoint,
}: Props) {
  const [uploading, setUploading] = useState(false);

  const [linkUrl, setLinkUrl] = useState("");
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // PREVIEW MODAL
  const [previewOpen, setPreviewOpen] = useState(false);

  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

  // =========================================
  // FETCH
  // =========================================

  // =========================================
  // ESC CLOSE PREVIEW
  // =========================================
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewOpen(false);
      }
    };

    window.addEventListener("keydown", esc);

    return () => window.removeEventListener("keydown", esc);
  }, []);

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
  const getFileUrl = (path?: string) => {
    if (!path) return "#";

    return `${import.meta.env.VITE_API_URL}/storage/${path}`;
  };

  // =========================================
  // IMAGE CHECK
  // =========================================
  const isImage = (type?: string) => {
    if (!type) return false;

    return type === "image" || type.startsWith("image/");
  };

  // =========================================
  // PDF CHECK
  // =========================================
  const isPdf = (type?: string) => {
    return type === "pdf" || type === "application/pdf";
  };

  // =========================================
  // OPEN PREVIEW
  // =========================================
  const openPreview = (item: Attachment) => {
    setPreviewFile(item);

    setPreviewOpen(true);
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

    if (!uploadEndpoint) return; // ✅ IMPORTANT GUARD

    if (file.size > MAX_FILE_SIZE) {
      alert("Ukuran file maksimal 10MB");
      e.target.value = "";
      return;
    }

    const formData = new FormData();

    formData.append("type", "file");
    formData.append("file", file);

    try {
      setUploading(true);

      await api.post(uploadEndpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await fetchAttachments?.(); // ✅ optional safe call
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // =========================================
  // ADD LINK
  // =========================================
  const handleAddLink = async () => {
    if (!linkUrl.trim()) return;

    if (!uploadEndpoint) return; // ✅ IMPORTANT GUARD

    try {
      setUploading(true);

      await api.post(uploadEndpoint, {
        type: "link",
        link_url: linkUrl,
      });

      setLinkUrl("");

      await fetchAttachments?.(); // ✅ safe call
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

  return (
    <>
      <section className="space-y-4">
        {/* HEADER */}

        {/* UPLOADER */}
        {showUploader && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
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
          h-12
          w-full
          cursor-pointer
          items-center
          justify-center
          gap-2
          rounded-xl
          border
          border-dashed
          border-gray-300
          bg-white
          text-sm
          font-medium
          text-gray-700
          transition
          hover:border-blue-400
          hover:bg-blue-50
        "
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload
                      size={16}
                      className="transition group-hover:scale-110"
                    />
                    Upload File
                  </>
                )}

                <input type="file" onChange={handleUpload} className="hidden" />
              </label>

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

                <button
                  onClick={handleAddLink}
                  disabled={uploading || !linkUrl.trim()}
                  className="
            flex
            h-11
            min-w-[100px]
            items-center
            justify-center
            rounded-xl
            bg-blue-600
            px-4
            text-sm
            font-medium
            text-white
            transition
            hover:bg-blue-700
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
                >
                  {uploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Add Link"
                  )}
                </button>
              </div>
              <p className="text-xs text-red-400">
                File yang diunggah harus berukuran maksimal 10MB
              </p>
            </div>
          </div>
        )}

        {/* LIST */}
        {/* ATTACHMENT LIST */}
        <div className="space-y-3">
          {/* LOADING */}
          {loading && (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white py-6 text-sm text-gray-500 shadow-sm">
              <Loader2 size={18} className="animate-spin" />

              <span>Loading attachments...</span>
            </div>
          )}

          {/* EMPTY */}
          {!loading && attachments.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <Paperclip size={24} />
              </div>

              <h3 className="text-sm font-semibold text-gray-700">
                Belum ada attachment
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Upload file atau tambahkan link
              </p>
            </div>
          )}

          {/* LIST */}
          {!loading &&
            attachments.map((item) => {
              const fileUrl = getFileUrl(item.file_path);

              const clickable = item.attachment_type === "file";

              return (
                <div
                  key={item.id}
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-md"
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* ========================================= */}
                    {/* THUMBNAIL */}
                    {/* ========================================= */}
                    <div
                      onClick={() => clickable && openPreview(item)}
                      className={`relative h-[84px] w-[120px] shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 ${
                        clickable ? "cursor-pointer" : ""
                      }`}
                    >
                      {/* IMAGE */}
                      {item.attachment_type === "file" &&
                        isImage(item.file_type) && (
                          <img
                            src={fileUrl}
                            alt={item.file_name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        )}

                      {/* PDF */}
                      {item.attachment_type === "file" &&
                        isPdf(item.file_type) && (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-red-50 text-red-600">
                            <FileText size={26} />

                            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide">
                              PDF
                            </span>
                          </div>
                        )}

                      {/* OTHER FILE */}
                      {item.attachment_type === "file" &&
                        !isImage(item.file_type) &&
                        !isPdf(item.file_type) && (
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
                          onClick={() => openPreview(item)}
                          className="max-w-full truncate text-left text-sm font-semibold text-gray-800 transition hover:text-blue-600 hover:underline"
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
                          <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-500">
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
                      </div>
                    </div>

                    {/* ========================================= */}
                    {/* ACTION */}
                    {/* ========================================= */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* ===================================== */}
      {/* PREVIEW MODAL */}
      {/* ===================================== */}
      {previewOpen && previewFile && (
        <div
          onClick={() => setPreviewOpen(false)}
          className="relative inset-0 z-[99999] flex items-center justify-center p-6"
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
                  onClick={() => setPreviewOpen(false)}
                  className="w-9 h-9 rounded-xl hover:bg-white/10 text-white flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* BODY */}
            <div className="max-h-[85vh] overflow-auto flex items-center justify-center bg-[#111]">
              {/* IMAGE */}
              {isImage(previewFile.file_type) && (
                <img
                  src={getFileUrl(previewFile.file_path)}
                  alt={previewFile.file_name}
                  className="max-w-full max-h-[82vh] object-contain"
                />
              )}

              {/* PDF */}
              {isPdf(previewFile.file_type) && (
                <iframe
                  src={getFileUrl(previewFile.file_path)}
                  className="w-full h-[82vh] bg-white"
                />
              )}

              {/* OTHER */}
              {!isImage(previewFile.file_type) &&
                !isPdf(previewFile.file_type) && (
                  <div className="h-[82vh] flex flex-col items-center justify-center text-gray-300">
                    <File size={60} />

                    <p className="mt-4 text-lg font-medium">
                      Preview tidak tersedia
                    </p>

                    <a
                      href={getFileUrl(previewFile.file_path)}
                      download={previewFile.file_name}
                      className="mt-5 inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    >
                      <Paperclip size={14} />
                      Download File
                    </a>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
