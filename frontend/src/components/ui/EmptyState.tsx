import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
  /** Varian ringkas untuk kolom kanban / panel kecil. */
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface-muted/40 text-center",
        compact ? "gap-2 px-4 py-6" : "gap-3 px-6 py-12",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-surface text-fg-subtle shadow-e1",
          compact ? "h-9 w-9" : "h-12 w-12",
        )}
        aria-hidden="true"
      >
        <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={1.6} />
      </span>

      <div className="max-w-sm space-y-1">
        <p
          className={cn(
            "font-medium text-fg",
            compact ? "text-xs" : "text-sm sm:text-base",
          )}
        >
          {title}
        </p>
        {description ? (
          <p className={cn("text-fg-muted", compact ? "text-[11px]" : "text-xs sm:text-sm")}>
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            "mt-1 inline-flex items-center gap-1.5 rounded-control bg-accent px-3 font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            compact ? "h-8 text-xs" : "h-9 text-sm",
          )}
        >
          {action.icon}
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
