import { CalendarDays, CalendarRange, SlidersHorizontal } from "lucide-react";

import type { DashboardFilter, DashboardPeriod } from "./dashboard.types";

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "day", label: "Harian" },
  { value: "week", label: "Mingguan" },
  { value: "month", label: "Bulanan" },
  { value: "year", label: "Tahunan" },
  { value: "all", label: "Semua" },
];

type Props = {
  value: DashboardFilter;
  onChange: (filter: DashboardFilter) => void;
  loading?: boolean;
};

export default function DashboardPeriodFilter({ value, onChange, loading }: Props) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1999 }, (_, index) => currentYear - index);

  const update = <Key extends keyof DashboardFilter>(
    key: Key,
    nextValue: DashboardFilter[Key],
  ) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900">Filter seluruh dashboard</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              KPI, status task, dan ranking divisi menggunakan periode yang sama.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-5 rounded-xl bg-slate-100 p-1">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={loading}
                onClick={() => update("period", option.value)}
                className={`rounded-lg px-2 py-2 text-[11px] font-bold transition-all disabled:cursor-wait sm:px-3 sm:text-xs ${
                  value.period === option.value
                    ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="min-w-0 sm:min-w-52">
            <ContextualPeriodInput
              value={value}
              years={years}
              loading={loading}
              update={update}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ContextualPeriodInput({
  value,
  years,
  loading,
  update,
}: {
  value: DashboardFilter;
  years: number[];
  loading?: boolean;
  update: <Key extends keyof DashboardFilter>(
    key: Key,
    value: DashboardFilter[Key],
  ) => void;
}) {
  const inputClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-wait disabled:bg-slate-50";

  if (value.period === "day" || value.period === "week") {
    return (
      <label className="relative block">
        <span className="sr-only">
          {value.period === "day" ? "Pilih tanggal" : "Tanggal acuan minggu"}
        </span>
        <CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input
          type="date"
          value={value.date}
          disabled={loading}
          onChange={(event) => update("date", event.target.value)}
          className={`${inputClass} pl-9`}
        />
      </label>
    );
  }

  if (value.period === "month") {
    return (
      <label className="relative block">
        <span className="sr-only">Pilih bulan</span>
        <CalendarRange className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input
          type="month"
          value={value.month}
          disabled={loading}
          onChange={(event) => update("month", event.target.value)}
          className={`${inputClass} pl-9`}
        />
      </label>
    );
  }

  if (value.period === "year") {
    return (
      <label>
        <span className="sr-only">Pilih tahun</span>
        <select
          value={value.year}
          disabled={loading}
          onChange={(event) => update("year", Number(event.target.value))}
          className={inputClass}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              Tahun {year}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label>
      <span className="sr-only">Batasi semua data berdasarkan tahun</span>
      <select
        value={value.all_year ?? ""}
        disabled={loading}
        onChange={(event) =>
          update("all_year", event.target.value ? Number(event.target.value) : null)
        }
        className={inputClass}
      >
        <option value="">Semua tahun</option>
        {years.map((year) => (
          <option key={year} value={year}>
            Hanya tahun {year}
          </option>
        ))}
      </select>
    </label>
  );
}
