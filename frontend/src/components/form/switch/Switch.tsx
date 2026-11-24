import { useState } from "react";

import { cn } from "@/lib/cn";

interface SwitchProps {
  label: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  color?: "blue" | "gray";
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({
  label,
  defaultChecked = false,
  disabled = false,
  onChange,
  color = "blue",
  className,
}) => {
  const [isChecked, setIsChecked] = useState(defaultChecked);

  const handleToggle = () => {
    if (disabled) return;
    const next = !isChecked;
    setIsChecked(next);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      aria-label={label}
      disabled={disabled}
      onClick={handleToggle}
      className={cn(
        "group flex items-center gap-3 text-sm font-medium",
        disabled
          ? "cursor-not-allowed text-fg-subtle"
          : "text-fg-muted hover:text-fg",
        className,
      )}
    >
      <span
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150",
          disabled
            ? "bg-surface-muted"
            : isChecked
              ? color === "blue"
                ? "bg-accent"
                : "bg-fg"
              : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-e1 transition-transform duration-150 ease-soft",
            isChecked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </span>
      <span className="text-left">{label}</span>
    </button>
  );
};

export default Switch;
