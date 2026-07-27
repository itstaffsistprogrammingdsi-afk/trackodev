import { useEffect } from 'react';
import { File, Image as ImageIcon, ShieldCheck, X } from 'lucide-react';

import { resolveStorageUrl } from '@/lib/storageUrl';

export type ReportAttachmentPreview = {
  name: string;
  url: string;
  fileType?: string | null;
};

type Props = {
  attachment: ReportAttachmentPreview | null;
  onClose: () => void;
};

export function AttachmentPreviewModal({ attachment, onClose }: Props) {
  useEffect(() => {
    if (!attachment) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [attachment, onClose]);

  if (!attachment) return null;

  const previewUrl = getSafePreviewUrl(attachment.url);
  const previewKind = getPreviewKind(attachment.name, attachment.fileType);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${attachment.name}`}
      onMouseDown={onClose}
    >
      <div
        className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-white sm:text-base">
              {attachment.name}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Preview aman di dalam aplikasi
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Tutup preview attachment"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-900">
          {!previewUrl ? (
            <PreviewMessage
              icon={<File className="h-12 w-12" aria-hidden="true" />}
              title="File tidak dapat dipreview"
              description="Alamat file tidak valid atau menggunakan protokol yang tidak diizinkan."
            />
          ) : previewKind === 'image' ? (
            <img
              src={previewUrl}
              alt={attachment.name}
              className="max-h-full max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : previewKind === 'pdf' ? (
            <iframe
              src={previewUrl}
              title={attachment.name}
              className="h-full min-h-[70vh] w-full border-0 bg-white"
              sandbox=""
              referrerPolicy="no-referrer"
            />
          ) : (
            <PreviewMessage
              icon={<ImageIcon className="h-12 w-12" aria-hidden="true" />}
              title="Preview belum tersedia"
              description="Format ini tidak dapat ditampilkan dengan aman di browser. File tidak akan dibuka di tab baru."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewMessage({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-md px-6 text-center text-slate-300">
      <div className="mx-auto flex justify-center text-slate-500">{icon}</div>
      <p className="mt-4 text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function getSafePreviewUrl(value: string): string | null {
  try {
    const resolved = resolveStorageUrl(value);
    const url = new URL(resolved, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function getPreviewKind(name: string, fileType?: string | null): 'image' | 'pdf' | 'other' {
  const value = `${fileType ?? ''} ${name}`.toLowerCase();

  if (/image\/(jpeg|jpg|png|gif|webp)/.test(value) || /\.(jpe?g|png|gif|webp)(?:$|[?#])/.test(value)) {
    return 'image';
  }

  if (value.includes('application/pdf') || /\.pdf(?:$|[?#])/.test(value)) {
    return 'pdf';
  }

  return 'other';
}
