import { useState } from "react";
import {
  Copy,
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
  const [exportPassword, setExportPassword] = useState(() => generateExportPassword());
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
    if (exportPassword.length < EXPORT_PASSWORD_MIN_LENGTH) {
      setError(`Password minimal ${EXPORT_PASSWORD_MIN_LENGTH} karakter.`);
      return;
    }

    try {
      setLoading(true);

      await exportMyWorkLog({
        type,
        format,
        ...(type === "daily" ? { date: selectedDate } : {}),
        export_password: exportPassword,
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
    <div className="rounded-2xl border border-gray-200 bg-white">
      {/* HEADER */}
      <div className="border-b border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900">
          Laporan Kinerja Individu
        </h2>
        <p className="text-xs text-gray-500 mt-1">
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
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
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
              <label htmlFor="report-start-date" className="mb-1 block text-xs text-gray-500">
                Tanggal Awal
              </label>
              <DatePickerField
                id="report-start-date"
                value={startDate}
                onChange={setStartDate}
              />
            </div>

            <div>
              <label htmlFor="report-end-date" className="mb-1 block text-xs text-gray-500">
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
            <label className="text-xs text-gray-500 block mb-1">Pilih Tahun</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm cursor-pointer hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
          <p className="text-xs text-red-600">
            Tanggal akhir tidak boleh lebih awal dari tanggal awal.
          </p>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        {/* FORMAT */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Format File</label>
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  onClick={() => setFormat(opt.key)}
                  className={`
                    flex flex-1 items-center justify-center gap-1.5
                    rounded-lg px-3 py-2 text-xs border transition
                    ${
                      format === opt.key
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
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
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
          <div className="mb-3 flex items-start gap-2.5">
            <span className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <ShieldCheck size={17} aria-hidden="true" />
            </span>
            <div>
              <label htmlFor="my-work-export-password" className="text-xs font-semibold text-emerald-950">Password Enkripsi</label>
              <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-800">File tetap berupa PDF atau Excel dan akan meminta password saat dibuka.</p>
            </div>
          </div>

          <div className="flex min-w-0 items-stretch overflow-hidden rounded-lg border border-emerald-200 bg-white focus-within:ring-2 focus-within:ring-emerald-500/20">
            <input
              id="my-work-export-password"
              type={showPassword ? "text" : "password"}
              value={exportPassword}
              minLength={EXPORT_PASSWORD_MIN_LENGTH}
              maxLength={128}
              autoComplete="new-password"
              spellCheck={false}
              onChange={(event) => {
                setExportPassword(event.target.value);
                setPasswordCopied(false);
              }}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-gray-900 outline-none"
              aria-describedby="my-work-export-password-help"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="px-2 text-gray-500 transition hover:text-gray-800"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              type="button"
              onClick={regeneratePassword}
              className="border-l border-gray-100 px-2 text-gray-500 transition hover:text-emerald-700"
              aria-label="Buat password baru"
            >
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              onClick={copyPassword}
              className="border-l border-gray-100 px-2.5 text-gray-500 transition hover:text-emerald-700"
              aria-label="Salin password"
            >
              <Copy size={16} />
            </button>
          </div>
          <p id="my-work-export-password-help" className="mt-2 text-[11px] text-emerald-800">
            {passwordCopied ? "Password berhasil disalin." : "Minimal 12 karakter dan tidak disimpan oleh sistem."}
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={loading || monthlyRangeInvalid}
          className="
            flex w-full items-center justify-center gap-2
            rounded-lg bg-blue-600 px-4 py-2.5 mt-2
            text-sm font-medium text-white
            hover:bg-blue-700 transition disabled:opacity-60
          "
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ShieldCheck size={16} />
          )}
          {loading
            ? "Mengekspor..."
            : `Export Aman ${format === "pdf" ? "PDF" : "Excel"}`}
        </button>
      </div>
    </div>
  );
}