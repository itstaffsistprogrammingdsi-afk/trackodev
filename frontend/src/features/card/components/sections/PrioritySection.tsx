import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import { CardPriority } from "../../types";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  priority?: CardPriority | null;
  loading?: boolean;
  disabled?: boolean;
  onChange?: (priority: CardPriority) => Promise<void> | void;
}

const PRIORITIES: {
  value: CardPriority;
  label: string;
  labelEn: string;
  dot: string;
  soft: string;
  text: string;
}[] = [
  {
    value: "low",
    label: "Rendah",
    labelEn: "Low",
    dot: "bg-priority-low-dot",
    soft: "bg-priority-low-soft",
    text: "text-priority-low",
  },
  {
    value: "medium",
    label: "Normal",
    labelEn: "Medium",
    dot: "bg-priority-medium-dot",
    soft: "bg-priority-medium-soft",
    text: "text-priority-medium",
  },
  {
    value: "high",
    label: "Tinggi",
    labelEn: "High",
    dot: "bg-priority-high-dot",
    soft: "bg-priority-high-soft",
    text: "text-priority-high",
  },
  {
    value: "urgent",
    label: "Urgent",
    labelEn: "Urgent",
    dot: "bg-priority-urgent-dot",
    soft: "bg-priority-urgent-soft",
    text: "text-priority-urgent",
  },
];

export default function PrioritySection({
  priority = "low",
  loading = false,
  disabled = false,
  onChange,
}: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const current = useMemo(
    () => PRIORITIES.find((item) => item.value === priority) ?? PRIORITIES[0],
    [priority],
  );

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
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
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("Prioritas: {label}", "Priority: {label}", {
          label: t(current.label, current.labelEn),
        })}
        className={`inline-flex h-9 items-center gap-2 rounded-control border border-transparent px-2.5 text-xs font-medium transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60 ${current.soft} ${current.text}`}
      >
        {loading || saving ? (
          <Loader2
            size={14}
            className="animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <span
            className={`h-2 w-2 rounded-full ${current.dot}`}
            aria-hidden="true"
          />
        )}

        <span>{t(current.label, current.labelEn)}</span>

        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`text-fg-subtle transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1.5 min-w-[176px] overflow-hidden rounded-card border border-line bg-surface p-1 shadow-e2"
          role="listbox"
          aria-label={t("Pilih prioritas", "Select priority")}
        >
          {PRIORITIES.map((item) => (
            <button
              key={item.value}
              type="button"
              role="option"
              aria-selected={item.value === priority}
              onClick={() => void handleSelect(item.value)}
              className={`flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                item.value === priority
                  ? `${item.soft} ${item.text} font-medium`
                  : "text-fg-muted hover:bg-surface-muted hover:text-fg"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${item.dot}`}
                aria-hidden="true"
              />
              <span className="flex-1">{t(item.label, item.labelEn)}</span>

              {item.value === priority ? (
                <Check size={13} aria-hidden="true" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
