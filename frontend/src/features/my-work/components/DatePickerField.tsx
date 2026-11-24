import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

type Props = {
  value: string; // "YYYY-MM-DD" (empty string = belum dipilih)
  onChange: (value: string) => void;
  align?: "left" | "right";
  id?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  clearable?: boolean;
};

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const pad = (n: number) => String(n).padStart(2, "0");

const toValue = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseValue = (v: string, fallback = new Date()) => {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y || fallback.getFullYear(), (m || fallback.getMonth() + 1) - 1, d || fallback.getDate());
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Date picker berbentuk kalender klik (bukan input ketik manual).
 * Dipakai untuk semua field "tanggal" bertipe harian di My Work
 * (AttachmentPanel & ExportLogPanel) supaya konsisten.
 */
export default function DatePickerField({
  value,
  onChange,
  className = "",
  align = "left",
  id,
  minDate,
  maxDate,
  placeholder = "Pilih tanggal",
  clearable = false,
}: Props) {
  const selected = value ? parseValue(value) : null;
  const minimum = minDate ? parseValue(minDate) : null;
  const maximum = maxDate ? parseValue(maxDate) : null;
  const initialViewDate = selected ?? new Date();

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(initialViewDate.getMonth());
  const [viewYear, setViewYear] = useState(initialViewDate.getFullYear());

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const openPicker = () => {
    const viewDate = selected ?? new Date();
    setViewMonth(viewDate.getMonth());
    setViewYear(viewDate.getFullYear());
    setOpen((prev) => !prev);
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const pickDay = (day: number) => {
    const pickedDate = new Date(viewYear, viewMonth, day);
    if (
      (minimum && pickedDate < minimum) ||
      (maximum && pickedDate > maximum)
    ) {
      return;
    }

    onChange(toValue(pickedDate));
    setOpen(false);
  };

  const goToToday = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (
      (minimum && today < minimum) ||
      (maximum && today > maximum)
    ) {
      return;
    }

    onChange(toValue(today));
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
    setOpen(false);
  };

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date();

  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const displayLabel = selected
    ? `${selected.getDate()} ${MONTHS[selected.getMonth()]} ${selected.getFullYear()}`
    : placeholder;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        id={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        type="button"
        onClick={openPicker}
        className={`w-full flex items-center justify-between gap-2 rounded-control border border-line bg-surface px-3 py-2 text-sm text-left hover:border-accent/30 focus:outline-none focus:ring-2 focus:ring-accent/15 ${clearable && selected ? "pr-10" : ""}`}
      >
        <span className={selected ? "text-fg" : "text-fg-subtle"}>{displayLabel}</span>
        <Calendar size={15} className="shrink-0 text-fg-subtle" />
      </button>

      {clearable && selected && (
        <button
          type="button"
          aria-label="Kosongkan tanggal"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
          className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-fg-subtle hover:bg-surface-muted hover:text-fg-muted"
        >
          <X size={13} />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Pilih tanggal"
          className={`absolute z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-control border border-line bg-surface p-3 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >

          {/* HEADER: prev/next bulan */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={goPrevMonth}
              className="rounded-control p-1.5 text-fg-subtle hover:bg-surface-muted"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="text-sm font-medium text-fg">
              {MONTHS[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={goNextMonth}
              className="rounded-control p-1.5 text-fg-subtle hover:bg-surface-muted"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* WEEKDAYS */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-2xs text-fg-subtle py-1">
                {w}
              </div>
            ))}
          </div>

          {/* DAYS */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;

              const cellDate = new Date(viewYear, viewMonth, day);
              const isSelected = selected ? isSameDay(cellDate, selected) : false;
              const isToday = isSameDay(cellDate, today);
              const isDisabled = Boolean(
                (minimum && cellDate < minimum) ||
                (maximum && cellDate > maximum),
              );

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => pickDay(day)}
                  disabled={isDisabled}
                  className={`
                    h-8 rounded-control text-sm transition
                    ${
                      isSelected
                        ? "bg-accent text-accent-fg font-semibold"
                        : isDisabled
                        ? "cursor-not-allowed text-fg-subtle"
                        : isToday
                        ? "border border-accent/30 text-accent font-medium hover:bg-accent-soft"
                        : "text-fg-muted hover:bg-surface-muted"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* FOOTER */}
          <div className="mt-2 pt-2 border-t border-line text-center">
            <button
              type="button"
              onClick={goToToday}
              className="text-xs font-medium text-accent hover:text-accent-strong"
            >
              Hari ini
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
