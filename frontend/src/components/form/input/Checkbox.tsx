import type React from "react";

import { cn } from "@/lib/cn";

interface CheckboxProps {
  label?: string;
  checked: boolean;
  className?: string;
  id?: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  id,
  onChange,
  className = "",
  disabled = false,
}) => {
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-center gap-2.5",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border-line text-accent accent-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed"
      />
      {label ? (
        <span className="text-sm font-medium text-fg-muted transition-colors group-hover:text-fg">
          {label}
        </span>
      ) : null}
    </label>
  );
};

export default Checkbox;
