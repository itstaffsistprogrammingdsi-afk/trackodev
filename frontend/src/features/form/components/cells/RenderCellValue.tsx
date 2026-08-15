import { resolveStorageUrl } from "@/lib/storageUrl";
import { ExternalLink, FileText } from "lucide-react";

export default function RenderCellValue({
  value,
  compact = false,
  label,
}: {
  value: unknown;
  compact?: boolean;
  label?: string;
}) {
  if (!value) return <span className="text-xs text-gray-400">-</span>;

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((v, i) => (
          <RenderCellValue key={i} value={v} compact={compact} label={label} />
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    return (
      <pre className="max-w-[240px] overflow-auto rounded-xl bg-gray-100 p-3 text-xs text-gray-600">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  const str = String(value);

  const pathWithoutQuery = str.split(/[?#]/, 1)[0];
  const isUrl = str.startsWith("http");
  const isImage = /\.(jpg|jpeg|png|webp|gif|avif|bmp)$/i.test(pathWithoutQuery);
  const isVideo = /\.(mp4|webm|ogg)$/i.test(pathWithoutQuery);
  const isFile = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt|rtf|zip|rar|7z)$/i.test(pathWithoutQuery);

  const fileUrl = resolveStorageUrl(str);
  const rawFileName = pathWithoutQuery.split("/").pop() || "File";
  const fileName = (() => {
    try {
      return decodeURIComponent(rawFileName);
    } catch {
      return rawFileName;
    }
  })();

  if (isImage) {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Buka gambar ${label ?? fileName}`}
        className="group inline-block overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      >
        <img
          src={fileUrl}
          alt={`Preview ${label ?? fileName}`}
          loading="lazy"
          className={`object-cover transition duration-200 group-hover:scale-105 ${
            compact ? "h-14 w-14" : "h-32 w-full max-w-56"
          }`}
        />
      </a>
    );
  }

  if (isVideo) {
    return compact ? (
      <span className="text-xs">Video</span>
    ) : (
      <video controls className="max-h-48 rounded-xl border">
        <source src={fileUrl} />
      </video>
    );
  }

  if (isFile) {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-indigo-600 transition hover:border-indigo-200 hover:bg-indigo-50"
      >
        <FileText size={15} className="shrink-0" aria-hidden="true" />
        <span className="truncate">{fileName}</span>
        <ExternalLink size={12} className="shrink-0" aria-hidden="true" />
      </a>
    );
  }

  if (isUrl) {
    return (
      <a href={fileUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 underline underline-offset-2">
        Buka tautan
      </a>
    );
  }

  return <div className="text-sm">{str}</div>;
}
