import { useState } from "react";
import {
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { exportMyWorkLog } from "../api/myWork.api";
import {
  EXPORT_PASSWORD_MIN_LENGTH,
  generateExportPassword,
} from "@/lib/exportSecurity";
import DatePickerField from "./DatePickerField";
import type { ExportPeriodType, ExportFormat } from "../types";

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i).reverse();

const PERIOD_OPTIONS: { key: ExportPeriodType; label: string }[] = [
  { key: "daily", label: "Harian" },
  { key: "monthly", label: "Bulanan" },
  { key: "yearly", label: "Tahunan" },
];

const FORMAT_OPTIONS: {
  key: ExportFormat;
  label: string;
  icon: typeof FileSpreadsheet;
}[] = [
  { key: "xlsx", label: "Excel", icon: FileSpreadsheet },
  { key: "pdf", label: "PDF", icon: FileText },
];

// Helper: format Date -> "YYYY-MM-DD" (aman dari geseran timezone ala toISOString)
const toDateInputValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function ExportLogPanel() {
  const now = new Date();

  const [type, setType] = useState<ExportPeriodType>("daily");
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [exportPassword, setExportPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Disimpan langsung sebagai string "YYYY-MM-DD", sesuai format <input type="date">
  const [selectedDate, setSelectedDate] = useState<string>(toDateInputValue(now));

  const [startDate, setStartDate] = useState(
    toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
  );
  const [endDate, setEndDate] = useState(
    toDateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  );
  const [year, setYear] = useState(now.getFullYear());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const monthlyRangeInvalid = type === "monthly" && startDate > endDate;

  const copyPassword = async () => {
    if (!exportPassword) return;

    await navigator.clipboard.writeText(exportPassword);
    setPasswordCopied(true);
    window.setTimeout(() => setPasswordCopied(false), 2000);
  };

  const regeneratePassword = () => {
    setExportPassword(generateExportPassword());
    setPasswordCopied(false);
  };

  const handleExport = async () => {
    setError(null);
    if (
      exportPassword.length > 0 &&
      exportPassword.length < EXPORT_PASSWORD_MIN_LENGTH
    ) {
      setError(`Password minimal ${EXPORT_PASSWORD_MIN_LENGTH} karakter.`);
      return;
    }

    try {
      setLoading(true);

      await exportMyWorkLog({
        type,
        format,
        ...(type === "daily" ? { date: selectedDate } : {}),
        ...(exportPassword ? { export_password: exportPassword } : {}),
        ...(type === "monthly"
          ? { start_date: startDate, end_date: endDate }
          : {}),
        ...(type === "yearly" ? { year } : {}),
      });
    } catch {
      setError("Gagal mengekspor laporan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-panel border border-line bg-surface">
      {/* HEADER */}
      <div className="border-b border-line p-5">
        <h2 className="text-base font-semibold text-fg">
          Laporan Kinerja Individu
        </h2>
        <p className="text-xs text-fg-subtle mt-1">
          Unduh ringkasan progres task dan attachment Anda
        </p>
      </div>

      {/* BODY */}
      <div className="p-5 space-y-4">
        {/* PERIOD TYPE */}
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setType(opt.key)}
              className={`
                flex-1 rounded-full px-3 py-1.5 text-xs border transition
                ${
                  type === opt.key
                    ? "bg-accent text-accent-fg border-accent shadow-e1"
                    : "bg-surface text-fg-muted border-line hover:bg-surface-muted/50"
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* PERIOD VALUE */}
        {type === "daily" && (
          <div>
            <DatePickerField value={selectedDate} onChange={setSelectedDate} />
          </div>
        )}

        {type === "monthly" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="report-start-date" className="mb-1 block text-xs text-fg-subtle">
                Tanggal Awal
              </label>
              <DatePickerField
                id="report-start-date"
                value={startDate}
                onChange={setStartDate}
              />
            </div>

            <div>
              <label htmlFor="report-end-date" className="mb-1 block text-xs text-fg-subtle">
                Tanggal Akhir
              </label>
              <DatePickerField
                id="report-end-date"
                value={endDate}
                onChange={setEndDate}
                align="right"
              />
            </div>
          </div>
        )}

        {type === "yearly" && (
          <div>
            <label className="text-xs text-fg-subtle block mb-1">Pilih Tahun</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-control border border-line bg-surface px-3 py-2 text-sm cursor-pointer hover:border-accent/30 focus:outline-none focus:ring-2 focus:ring-accent/15"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {monthlyRangeInvalid && (
          <p className="text-xs text-danger">
            Tanggal akhir tidak boleh lebih awal dari tanggal awal.
          </p>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        {/* FORMAT */}
        <div>
          <label className="text-xs text-fg-subtle block mb-1">Format File</label>
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  onClick={() => setFormat(opt.key)}
                  className={`
                    flex flex-1 items-center justify-center gap-1.5
                    rounded-control px-3 py-2 text-xs border transition
                    ${
                      format === opt.key
                        ? "bg-accent-soft text-accent-strong border-accent/20"
                        : "bg-surface text-fg-muted border-line hover:bg-surface-muted/50"
                    }
                  `}
                >
                  <Icon size={14} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* EXPORT BUTTON */}
        {/* EXPORT SECURITY */}
        <div className="rounded-control border border-success/20 bg-success-soft/70 p-3.5">
          <div className="mb-3 flex items-start gap-2.5">
            <span className="rounded-control bg-success-soft p-2 text-success">
              <ShieldCheck size={17} aria-hidden="true" />
            </span>
            <div>
              <label htmlFor="my-work-export-password" className="text-xs font-semibold text-fg">Password Enkripsi (Opsional)</label>
              <p className="mt-0.5 text-2xs leading-relaxed text-success">Kosongkan agar file dapat langsung dibuka, atau isi password untuk mengenkripsinya.</p>
            </div>
          </div>

          <div className="flex min-w-0 items-stretch overflow-hidden rounded-control border border-success/20 bg-surface focus-within:ring-2 focus-within:ring-success/20">
            <input
              id="my-work-export-password"
              type={showPassword ? "text" : "password"}
              value={exportPassword}
              minLength={EXPORT_PASSWORD_MIN_LENGTH}
              maxLength={128}
              autoComplete="new-password"
              spellCheck={false}
              placeholder="Kosongkan untuk tanpa password"
              onChange={(event) => {
                setExportPassword(event.target.value);
                setPasswordCopied(false);
              }}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-fg outline-none"
              aria-describedby="my-work-export-password-help"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="px-2 text-fg-subtle transition hover:text-fg"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              type="button"
              onClick={regeneratePassword}
              className="border-l border-line px-2 text-fg-subtle transition hover:text-success"
              aria-label="Buat password baru"
            >
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              onClick={copyPassword}
              disabled={!exportPassword}
              className="border-l border-line px-2.5 text-fg-subtle transition hover:text-success disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Salin password"
            >
              <Copy size={16} />
            </button>
          </div>
          <p id="my-work-export-password-help" className="mt-2 text-2xs text-success">
            {passwordCopied
              ? "Password berhasil disalin."
              : exportPassword
                ? `Jika diisi, password minimal ${EXPORT_PASSWORD_MIN_LENGTH} karakter dan tidak disimpan sistem.`
                : "File akan diunduh tanpa password."}
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={loading || monthlyRangeInvalid}
          className="
            flex w-full items-center justify-center gap-2
            rounded-control bg-accent px-4 py-2.5 mt-2
            text-sm font-medium text-accent-fg
            hover:bg-accent-strong transition disabled:opacity-60
          "
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            exportPassword ? <ShieldCheck size={16} /> : <Download size={16} />
          )}
          {loading
            ? "Mengekspor..."
            : `Export ${format === "pdf" ? "PDF" : "Excel"}${exportPassword ? " Terenkripsi" : ""}`}
        </button>
      </div>
    </div>
  );
}
