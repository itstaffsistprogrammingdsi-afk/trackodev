import { useEffect, useState } from "react";
import { Copy, Download, Eye, EyeOff, Loader2, LockKeyhole, RefreshCw, ShieldCheck, X } from "lucide-react";

import { EXPORT_PASSWORD_MIN_LENGTH } from "@/lib/exportSecurity";

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
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="secure-export-title">
      <button className="absolute inset-0 cursor-default" aria-label="Tutup dialog" onClick={loading ? undefined : onClose} />

      <div className="relative w-full rounded-t-3xl border border-white/60 bg-white shadow-2xl sm:max-w-md sm:rounded-3xl">
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
          <span className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
            <ShieldCheck size={24} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="secure-export-title" className="text-base font-bold text-slate-950">Keamanan File Laporan</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Kosongkan password agar file {format === "pdf" ? "PDF" : "Excel"} dapat langsung dibuka, atau isi untuk mengenkripsinya.</p>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50" aria-label="Tutup dialog">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-950">
              <LockKeyhole size={15} /> Password Enkripsi (Opsional)
            </div>
            <div className="flex min-w-0 overflow-hidden rounded-xl border border-emerald-200 bg-white focus-within:ring-2 focus-within:ring-emerald-500/20">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                minLength={EXPORT_PASSWORD_MIN_LENGTH}
                maxLength={128}
                autoComplete="new-password"
                spellCheck={false}
                placeholder="Kosongkan untuk tanpa password"
                onChange={(event) => {
                  onPasswordChange(event.target.value);
                  setCopied(false);
                }}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-950 outline-none"
                aria-label="Password enkripsi"
                autoFocus
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="px-2.5 text-slate-500 transition hover:text-slate-800" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
              <button type="button" onClick={onRegenerate} className="border-l border-slate-100 px-2.5 text-slate-500 transition hover:text-emerald-700" aria-label="Buat password baru">
                <RefreshCw size={17} />
              </button>
              <button type="button" onClick={copyPassword} disabled={!hasPassword} className="border-l border-slate-100 px-2.5 text-slate-500 transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Salin password">
                <Copy size={17} />
              </button>
            </div>
            <p className={`mt-2 text-[11px] ${passwordValid ? "text-emerald-800" : "text-red-600"}`}>
              {copied
                ? "Password berhasil disalin."
                : !hasPassword
                  ? "File akan diunduh tanpa password."
                  : passwordValid
                    ? "File akan dienkripsi. Simpan password sebelum menutup dialog."
                    : `Password minimal ${EXPORT_PASSWORD_MIN_LENGTH} karakter.`}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Batal</button>
            <button type="button" onClick={onConfirm} disabled={loading || !passwordValid} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : hasPassword ? (
                <ShieldCheck size={17} />
              ) : (
                <Download size={17} />
              )}
              {loading
                ? "Menyiapkan file..."
                : `Download ${format === "pdf" ? "PDF" : "Excel"}${hasPassword ? " Terenkripsi" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
