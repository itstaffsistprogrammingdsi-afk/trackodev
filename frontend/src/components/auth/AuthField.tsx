import type { InputHTMLAttributes, ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/cn";

interface AuthFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  id: string;
  label: string;
  icon: ReactNode;
  labelAction?: ReactNode;
  trailing?: ReactNode;
  hint?: string;
  error?: string;
  className?: string;
}

export default function AuthField({
  id,
  label,
  icon,
  labelAction,
  trailing,
  hint,
  error,
  className,
  ...inputProps
}: AuthFieldProps) {
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-medium text-fg-muted">
          {label}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle [&_svg]:h-4 [&_svg]:w-4"
        >
          {icon}
        </span>
        <input
          {...inputProps}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-11 w-full rounded-control border border-line bg-surface pl-10 text-sm text-fg placeholder:text-fg-subtle",
            "transition-[border-color,box-shadow] duration-150",
            "focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15",
            trailing ? "pr-11" : "pr-3.5",
            error
              ? "border-danger focus:border-danger focus:ring-danger/15"
              : undefined,
            className,
          )}
        />
        {trailing}
      </div>

      {error ? (
        <p id={`${id}-error`} className="text-[11px] leading-4 text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[11px] text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const authPrimaryButtonClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-60";

interface PasswordToggleProps {
  visible: boolean;
  onToggle: () => void;
}

export function PasswordToggle({ visible, onToggle }: PasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseDown={(event) => event.preventDefault()}
      aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
      aria-pressed={visible}
      className="absolute right-0.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[8px] text-fg-subtle transition-colors duration-150 hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {visible ? (
        <EyeOff aria-hidden="true" className="h-4 w-4" />
      ) : (
        <Eye aria-hidden="true" className="h-4 w-4" />
      )}
    </button>
  );
}
