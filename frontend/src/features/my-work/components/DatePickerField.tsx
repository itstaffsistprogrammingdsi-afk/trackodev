import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  className?: string;
};

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const pad = (n: number) => String(n).padStart(2, "0");

const toValue = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseValue = (v: string) => {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
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
export default function DatePickerField({ value, onChange, className = "" }: Props) {
  const selected = parseValue(value);

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const [viewYear, setViewYear] = useState(selected.getFullYear());

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
    setViewMonth(selected.getMonth());
    setViewYear(selected.getFullYear());
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
    onChange(toValue(new Date(viewYear, viewMonth, day)));
    setOpen(false);
  };

  const goToToday = () => {
    const today = new Date();
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

  const displayLabel = `${selected.getDate()} ${MONTHS[selected.getMonth()]} ${selected.getFullYear()}`;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={openPicker}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-left hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <span className="text-gray-900">{displayLabel}</span>
        <Calendar size={15} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">

          {/* HEADER: prev/next bulan */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={goPrevMonth}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="text-sm font-medium text-gray-900">
              {MONTHS[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={goNextMonth}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* WEEKDAYS */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[11px] text-gray-400 py-1">
                {w}
              </div>
            ))}
          </div>

          {/* DAYS */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;

              const cellDate = new Date(viewYear, viewMonth, day);
              const isSelected = isSameDay(cellDate, selected);
              const isToday = isSameDay(cellDate, today);

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => pickDay(day)}
                  className={`
                    h-8 rounded-lg text-sm transition
                    ${
                      isSelected
                        ? "bg-blue-600 text-white font-semibold"
                        : isToday
                        ? "border border-blue-300 text-blue-600 font-medium hover:bg-blue-50"
                        : "text-gray-700 hover:bg-gray-100"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* FOOTER */}
          <div className="mt-2 pt-2 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={goToToday}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Hari ini
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
