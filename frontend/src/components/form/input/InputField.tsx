import type React from "react";
import type { FC } from "react";

import { cn } from "@/lib/cn";

interface InputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;
  id?: string;
  name?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string;
  autoComplete?: string;
  required?: boolean;
  "aria-label"?: string;
}

const Input: FC<InputProps> = ({
  type = "text",
  id,
  name,
  placeholder,
  value,
  onChange,
  className,
  min,
  max,
  step,
  disabled = false,
  success = false,
  error = false,
  hint,
  autoComplete,
  required,
  "aria-label": ariaLabel,
}) => {
  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        autoComplete={autoComplete}
        required={required}
        aria-label={ariaLabel}
        aria-invalid={error || undefined}
        className={cn(
          "h-10 w-full appearance-none rounded-control border bg-surface px-3 text-sm text-fg shadow-none outline-none transition-[border-color,box-shadow,background-color] duration-150",
          "placeholder:text-fg-subtle focus:ring-2",
          disabled
            ? "cursor-not-allowed border-line bg-surface-muted text-fg-subtle opacity-70"
            : error
              ? "border-danger/50 focus:border-danger focus:ring-danger/15"
              : success
                ? "border-success/50 focus:border-success focus:ring-success/15"
                : "border-line hover:border-line-strong focus:border-accent focus:ring-accent/15",
          className,
        )}
      />

      {hint ? (
        <p
          className={cn(
            "mt-1.5 text-xs",
            error
              ? "text-danger"
              : success
                ? "text-success"
                : "text-fg-subtle",
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
};

export default Input;
