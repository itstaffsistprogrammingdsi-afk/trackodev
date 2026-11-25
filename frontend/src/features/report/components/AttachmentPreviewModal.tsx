import { useEffect, useState } from 'react';
import { Download, File, Image as ImageIcon, ShieldCheck, X } from 'lucide-react';

import { resolveStorageUrl } from '@/lib/storageUrl';
import { saveBlobFile } from '@/lib/nativeDownload';
import { isMobileApp } from '@/lib/mobileConfig';
import { toast } from '@/lib/feedback';
import { useLanguage } from '@/context/LanguageContext';

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
  const { t } = useLanguage();
  const nativeApp = isMobileApp();
  const [opening, setOpening] = useState(false);

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

  const openWithAnotherApp = async () => {
    if (!previewUrl || opening) return;

    setOpening(true);
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      await saveBlobFile(blob, attachment.name, 'attachment');
    } catch (error) {
      console.error('Gagal membuka file di aplikasi lain', error);
      toast.error(
        t(
          'Gagal membuka file. Silakan coba lagi.',
          'Failed to open the file. Please try again.',
        ),
      );
    } finally {
      setOpening(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t("Preview {name}", "Preview {name}", { name: attachment.name })}
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
              {t("Preview aman di dalam aplikasi", "Secure preview inside the app")}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {nativeApp && previewUrl && previewKind !== 'image' ? (
              <button
                type="button"
                onClick={() => void openWithAnotherApp()}
                disabled={opening}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-xs font-medium text-white transition hover:bg-white/20 disabled:opacity-60"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {opening
                  ? t('Menyiapkan…', 'Preparing…')
                  : t('Buka file', 'Open file')}
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label={t("Tutup preview attachment", "Close attachment preview")}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-900">
          {!previewUrl ? (
            <PreviewMessage
              icon={<File className="h-12 w-12" aria-hidden="true" />}
              title={t("File tidak dapat dipreview", "File cannot be previewed")}
              description={t("Alamat file tidak valid atau menggunakan protokol yang tidak diizinkan.", "The file address is invalid or uses a disallowed protocol.")}
            />
          ) : previewKind === 'image' ? (
            <img
              src={previewUrl}
              alt={attachment.name}
              className="max-h-full max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : previewKind === 'pdf' ? (
            nativeApp ? (
              <PreviewMessage
                icon={<File className="h-12 w-12" aria-hidden="true" />}
                title={t('PDF siap dibuka', 'PDF is ready to open')}
                description={t(
                  'Gunakan tombol Buka file untuk membuka PDF dengan aplikasi pembaca di perangkat.',
                  'Use the Open file button to open the PDF with a viewer on this device.',
                )}
              />
            ) : (
              <iframe
                src={previewUrl}
                title={attachment.name}
                className="h-full min-h-[70vh] w-full border-0 bg-white"
                sandbox=""
                referrerPolicy="no-referrer"
              />
            )
          ) : (
            <PreviewMessage
              icon={<ImageIcon className="h-12 w-12" aria-hidden="true" />}
              title={t("Preview belum tersedia", "Preview not available yet")}
              description={t("Format ini tidak dapat ditampilkan dengan aman di browser. File tidak akan dibuka di tab baru.", "This format cannot be displayed safely in the browser. The file will not open in a new tab.")}
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
    if (value.startsWith('blob:')) {
      return value;
    }

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
