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
    <section className="rounded-panel border border-line bg-surface p-3 sm:p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-muted text-fg-muted">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-fg">Filter seluruh dashboard</h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              KPI, status task, dan ranking divisi menggunakan periode yang sama.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-5 rounded-control bg-surface-muted p-1">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={loading}
                onClick={() => onChange({ ...value, period: option.value, all_year: null })}
                aria-pressed={value.period === option.value}
                className={`rounded-[7px] px-2 py-1.5 text-[11px] font-medium transition-colors duration-150 disabled:cursor-wait sm:px-3 sm:text-xs ${
                  value.period === option.value
                    ? "bg-surface text-fg shadow-e1"
                    : "text-fg-muted hover:text-fg"
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
              onChange={onChange}
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
  onChange,
}: {
  value: DashboardFilter;
  years: number[];
  loading?: boolean;
  update: <Key extends keyof DashboardFilter>(
    key: Key,
    value: DashboardFilter[Key],
  ) => void;
  onChange: (filter: DashboardFilter) => void;
}) {
  const now = new Date();
  const todayDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const currentMonthValue = todayDate.slice(0, 7);

  const inputClass =
    "h-9 w-full rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/15 disabled:cursor-wait disabled:bg-surface-muted";

  if (value.period === "day" || value.period === "week") {
    return (
      <label className="relative block">
        <span className="sr-only">
          {value.period === "day" ? "Pilih tanggal" : "Tanggal acuan minggu"}
        </span>
        <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-fg-subtle" />
        <input
          type="date"
          value={value.date}
          disabled={loading}
          onChange={(event) => {
            const nextDate = event.target.value || todayDate;
            onChange({
              ...value,
              date: nextDate,
              month: nextDate.slice(0, 7),
              year: Number(nextDate.slice(0, 4)) || value.year,
            });
          }}
          className={`${inputClass} pl-9`}
        />
      </label>
    );
  }

  if (value.period === "month") {
    return (
      <label className="relative block">
        <span className="sr-only">Pilih bulan</span>
        <CalendarRange className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-fg-subtle" />
        <input
          type="month"
          value={value.month}
          disabled={loading}
          onChange={(event) => {
            const nextMonth = event.target.value || currentMonthValue;
            onChange({
              ...value,
              month: nextMonth,
              year: Number(nextMonth.slice(0, 4)) || value.year,
            });
          }}
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
