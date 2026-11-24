import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  xs: "h-8 px-2.5 text-xs",
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-3.5 text-sm",
  lg: "h-11 px-4 text-sm",
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-strong focus-visible:ring-accent/40",
  secondary:
    "border border-line bg-surface text-fg hover:bg-surface-muted focus-visible:ring-accent/40",
  outline:
    "border border-line bg-surface text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:ring-accent/40",
  ghost:
    "text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:ring-accent/40",
  danger:
    "bg-danger text-white hover:opacity-90 focus-visible:ring-danger/40 dark:text-[#2a1110]",
};

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  loading = false,
  fullWidth = false,
  className,
  disabled = false,
  type = "button",
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control font-medium transition-[background-color,border-color,color,transform,opacity] duration-150 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:cursor-not-allowed disabled:opacity-60",
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2
          aria-hidden="true"
          className="h-4 w-4 animate-spin motion-reduce:animate-none"
        />
      ) : startIcon ? (
        <span className="flex shrink-0 items-center [&_svg]:h-4 [&_svg]:w-4">
          {startIcon}
        </span>
      ) : null}

      <span className="truncate">{children}</span>

      {!loading && endIcon ? (
        <span className="flex shrink-0 items-center [&_svg]:h-4 [&_svg]:w-4">
          {endIcon}
        </span>
      ) : null}
    </button>
  );
};

export default Button;
