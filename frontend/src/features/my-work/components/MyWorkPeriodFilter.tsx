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
    <div className="w-full rounded-control border border-line bg-surface p-1 sm:w-auto">
      <div className="flex items-center gap-1 overflow-x-auto">
        <div className="hidden shrink-0 items-center gap-1.5 px-2 text-[11px] font-medium text-fg-muted md:flex">
          <CalendarRange size={14} aria-hidden="true" />
          Periode
        </div>

        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`shrink-0 rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-wait disabled:opacity-60 sm:px-3.5 ${
              value === option.value
                ? "bg-surface-muted text-fg"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
