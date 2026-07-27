import { CalendarRange } from "lucide-react";

import type { ActivityRange } from "../types";

type Props = {
  value: ActivityRange;
  onChange: (value: ActivityRange) => void;
  disabled?: boolean;
};

const OPTIONS: { value: ActivityRange; label: string }[] = [
  { value: "today", label: "Hari ini" },
  { value: "week", label: "Minggu ini" },
  { value: "month", label: "Bulan ini" },
  { value: "all", label: "Semua" },
];

export default function MyWorkPeriodFilter({
  value,
  onChange,
  disabled = false,
}: Props) {
  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm sm:w-auto">
      <div className="flex items-center gap-1 overflow-x-auto">
        <div className="hidden shrink-0 items-center gap-2 px-2 text-xs font-medium text-gray-500 md:flex">
          <CalendarRange size={15} aria-hidden="true" />
          Periode
        </div>

        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-all disabled:cursor-wait disabled:opacity-60 sm:px-4 ${
              value === option.value
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
