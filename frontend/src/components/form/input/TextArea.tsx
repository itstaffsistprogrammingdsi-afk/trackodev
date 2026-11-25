import React from "react";

import { cn } from "@/lib/cn";

interface TextareaProps {
  placeholder?: string;
  rows?: number;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  hint?: string;
  id?: string;
  name?: string;
  required?: boolean;
  maxLength?: number;
}

const TextArea: React.FC<TextareaProps> = ({
  placeholder = "",
  rows = 3,
  value = "",
  onChange,
  className,
  disabled = false,
  error = false,
  hint = "",
  id,
  name,
  required,
  maxLength,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div className="relative">
      <textarea
        id={id}
        name={name}
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        aria-invalid={error || undefined}
        className={cn(
          "w-full resize-y rounded-control border bg-surface px-3 py-2.5 text-sm leading-5 text-fg outline-none transition-[border-color,box-shadow,background-color] duration-150",
          "placeholder:text-fg-subtle focus:ring-2",
          disabled
            ? "cursor-not-allowed border-line bg-surface-muted text-fg-subtle opacity-70"
            : error
              ? "border-danger/50 focus:border-danger focus:ring-danger/15"
              : "border-line hover:border-line-strong focus:border-accent focus:ring-accent/15",
          className,
        )}
      />

      {hint ? (
        <p
          className={cn(
            "mt-1.5 text-xs",
            error ? "text-danger" : "text-fg-subtle",
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
};

export default TextArea;
