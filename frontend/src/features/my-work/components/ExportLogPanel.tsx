import { useState } from "react";
import { Download, FileText, Loader2, FileSpreadsheet } from "lucide-react";

import { exportMyWorkLog } from "../api/myWork.api";
import type { ExportPeriodType, ExportFormat } from "../types";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

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

  // Disimpan langsung sebagai string "YYYY-MM-DD", sesuai format <input type="date">
  const [selectedDate, setSelectedDate] = useState<string>(toDateInputValue(now));

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);

      await exportMyWorkLog({
        type,
        format,
        ...(type === "daily" ? { date: selectedDate } : {}),
        ...(type === "monthly" ? { month, year } : {}),
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
          Export Laporan
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Unduh ringkasan task selesai, log aktivitas, dan attachment
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
            <label className="text-xs text-gray-500 block mb-1">Pilih Tanggal</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm cursor-pointer hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        )}

        {type === "monthly" && (
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Bulan</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm cursor-pointer hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Tahun</label>
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
        <button
          onClick={handleExport}
          disabled={loading}
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
            <Download size={16} />
          )}
          {loading
            ? "Mengekspor..."
            : `Export ${format === "pdf" ? "PDF" : "Excel"}`}
        </button>
      </div>
    </div>
  );
}