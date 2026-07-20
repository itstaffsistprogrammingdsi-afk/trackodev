import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronDown, Loader2 } from "lucide-react";

import { CardPriority } from "../../types";

interface Props {
  priority?: CardPriority | null;
  loading?: boolean;
  disabled?: boolean;
  onChange?: (priority: CardPriority) => Promise<void> | void;
}

const PRIORITIES: {
  value: CardPriority;
  label: string;
  color: string;
}[] = [
  {
    value: "low",
    label: "Low",
    color: "bg-green-500",
  },
  {
    value: "medium",
    label: "Medium",
    color: "bg-yellow-500",
  },
  {
    value: "high",
    label: "High",
    color: "bg-orange-500",
  },
  {
    value: "urgent",
    label: "Urgent",
    color: "bg-red-500",
  },
];

export default function PrioritySection({
  priority = "low",
  loading = false,
  disabled = false,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const current = useMemo(
    () => PRIORITIES.find((item) => item.value === priority) ?? PRIORITIES[0],
    [priority],
  );

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = async (value: CardPriority) => {
    if (disabled || saving || value === priority) {
      setOpen(false);
      return;
    }

    try {
      setSaving(true);

      await onChange?.(value);

      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        disabled={disabled || loading || saving}
        onClick={() => setOpen((prev) => !prev)}
        className="
          inline-flex
          items-center
          gap-2
          rounded-lg
          border
          border-slate-200
          bg-white
          px-3
          py-2
          text-sm
          font-medium
          text-slate-700
          shadow-sm
          transition-all
          hover:border-slate-300
          hover:bg-slate-50
          disabled:cursor-not-allowed
          disabled:opacity-60
          dark:border-slate-700
          dark:bg-slate-800
          dark:text-slate-200
          dark:hover:border-slate-600
          dark:hover:bg-slate-700
        "
      >
        {loading || saving ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <span className={`h-2.5 w-2.5 rounded-full ${current.color}`} />
        )}

        <span>{current.label}</span>

        <ChevronDown
          size={15}
          className={`transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className="
absolute
left-full
top-0
ml-2
z-50
min-w-[180px]
overflow-hidden
rounded-xl
border
bg-white
shadow-xl
dark:border-slate-700
dark:bg-slate-800
"
        >
          {PRIORITIES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => void handleSelect(item.value)}
              className="
                flex
                w-full
                items-center
                gap-3
                px-4
                py-2.5
                text-left
                text-sm
                transition
                hover:bg-slate-100
                dark:hover:bg-slate-700
              "
            >
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />

              <span className="flex-1">{item.label}</span>

              {item.value === priority && (
                <AlertCircle
                  size={14}
                  className="text-blue-600 dark:text-blue-400"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
