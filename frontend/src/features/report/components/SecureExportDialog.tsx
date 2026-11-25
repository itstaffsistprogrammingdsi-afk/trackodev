import { useEffect, useState } from "react";
import {
  Copy,
  Download,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";

import { EXPORT_PASSWORD_MIN_LENGTH } from "@/lib/exportSecurity";
import { useLanguage } from "@/context/LanguageContext";

type SecureExportDialogProps = {
  open: boolean;
  format: "pdf" | "excel";
  password: string;
  loading: boolean;
  onPasswordChange: (password: string) => void;
  onRegenerate: () => void;
  onClose: () => void;
  onConfirm: () => void;
};

export const SecureExportDialog = ({
  open,
  format,
  password,
  loading,
  onPasswordChange,
  onRegenerate,
  onClose,
  onConfirm,
}: SecureExportDialogProps) => {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasPassword = password.length > 0;
  const passwordValid =
    !hasPassword || password.length >= EXPORT_PASSWORD_MIN_LENGTH;

  useEffect(() => {
    if (open) {
      setShowPassword(false);
      setCopied(false);
    }
  }, [open, password]);

  if (!open) return null;

  const copyPassword = async () => {
    if (!hasPassword) return;

    await navigator.clipboard.writeText(password);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-overlay p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="secure-export-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t("Tutup dialog", "Close dialog")}
        onClick={loading ? undefined : onClose}
      />

      <div
        className="relative w-full overflow-hidden rounded-t-modal border border-line bg-surface shadow-e3 sm:max-w-md sm:rounded-modal"
        style={{ animation: "ui-scale-in 160ms ease-out" }}
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
            <ShieldCheck size={18} aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <h2
              id="secure-export-title"
              className="text-sm font-semibold tracking-heading text-fg"
            >
              {t("Keamanan file laporan", "Report file security")}
            </h2>
            <p className="mt-1 text-xs leading-5 text-fg-muted">
              {t(
                "Kosongkan password agar file {format} dapat langsung dibuka, atau isi untuk mengenkripsinya.",
                "Leave the password empty so the {format} file can be opened directly, or enter one to encrypt it.",
                { format: format === "pdf" ? "PDF" : "Excel" },
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-50"
            aria-label={t("Tutup dialog", "Close dialog")}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-card border border-line bg-surface-muted/50 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-2xs font-medium text-fg-muted">
              <LockKeyhole size={13} aria-hidden="true" />
              {t("Password enkripsi (opsional)", "Encryption password (optional)")}
            </div>

            <div className="flex min-w-0 overflow-hidden rounded-control border border-line bg-surface focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                minLength={EXPORT_PASSWORD_MIN_LENGTH}
                maxLength={128}
                autoComplete="new-password"
                spellCheck={false}
                placeholder={t("Kosongkan untuk tanpa password", "Leave empty for no password")}
                onChange={(event) => {
                  onPasswordChange(event.target.value);
                  setCopied(false);
                }}
                className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-xs text-fg outline-none placeholder:text-fg-subtle"
                aria-label={t("Password enkripsi", "Encryption password")}
                autoFocus
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="flex w-9 items-center justify-center text-fg-subtle transition-colors hover:text-fg"
                aria-label={
                  showPassword
                    ? t("Sembunyikan password", "Hide password")
                    : t("Tampilkan password", "Show password")
                }
              >
                {showPassword ? (
                  <EyeOff size={15} aria-hidden="true" />
                ) : (
                  <Eye size={15} aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={onRegenerate}
                className="flex w-9 items-center justify-center border-l border-line text-fg-subtle transition-colors hover:text-accent"
                aria-label={t("Buat password baru", "Generate new password")}
              >
                <RefreshCw size={15} aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={copyPassword}
                disabled={!hasPassword}
                className="flex w-9 items-center justify-center border-l border-line text-fg-subtle transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t("Salin password", "Copy password")}
              >
                <Copy size={15} aria-hidden="true" />
              </button>
            </div>

            <p
              className={`mt-2 text-2xs ${
                passwordValid ? "text-fg-subtle" : "text-danger"
              }`}
            >
              {copied
                ? t("Password berhasil disalin.", "Password copied successfully.")
                : !hasPassword
                  ? t("File akan diunduh tanpa password.", "The file will be downloaded without a password.")
                  : passwordValid
                    ? t("File akan dienkripsi. Simpan password sebelum menutup dialog.", "The file will be encrypted. Save the password before closing the dialog.")
                    : t("Password minimal {min} karakter.", "Password must be at least {min} characters.", { min: EXPORT_PASSWORD_MIN_LENGTH })}
            </p>
          </div>

          <div className="rounded-card border border-info/15 bg-info-soft px-3 py-2 text-2xs leading-4 text-info">
            {t("Simpan password di tempat aman. File terenkripsi tidak bisa dibuka tanpa password ini.", "Store the password somewhere safe. The encrypted file cannot be opened without it.")}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 rounded-control border border-line bg-surface px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-50"
            >
              {t("Batal", "Cancel")}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading || !passwordValid}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2
                  size={15}
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : hasPassword ? (
                <ShieldCheck size={15} aria-hidden="true" />
              ) : (
                <Download size={15} aria-hidden="true" />
              )}
              {loading
                ? t("Menyiapkan file…", "Preparing file…")
                : hasPassword
                  ? t("Unduh {format} terenkripsi", "Download encrypted {format}", {
                      format: format === "pdf" ? "PDF" : "Excel",
                    })
                  : t("Unduh {format}", "Download {format}", {
                      format: format === "pdf" ? "PDF" : "Excel",
                    })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
