import { useState } from "react";
import { Download, FileText, Loader2, FileSpreadsheet } from "lucide-react";

import { exportMyWorkLog } from "../api/myWork.api";
import type { ExportPeriodType, ExportFormat } from "../types";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

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

export default function ExportLogPanel() {
  const now = new Date();

  const [type, setType] = useState<ExportPeriodType>("daily");
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [date, setDate] = useState(now.toISOString().slice(0, 10));
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
        ...(type === "daily" ? { date } : {}),
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
            <label className="text-xs text-gray-500">Pilih Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        )}

        {type === "monthly" && (
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-xs text-gray-500">Bulan</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500">Tahun</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {type === "yearly" && (
          <div>
            <label className="text-xs text-gray-500">Pilih Tahun</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        {/* FORMAT */}
        <div>
          <label className="text-xs text-gray-500">Format File</label>
          <div className="mt-1 flex gap-2">
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
            rounded-lg bg-blue-600 px-4 py-2.5
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
