type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
type BadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: BadgeColor;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-2xs",
  md: "px-2.5 py-1 text-xs",
};

const lightStyles: Record<BadgeColor, string> = {
  primary: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  error: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  light: "bg-surface-muted text-fg-muted",
  dark: "bg-fg text-surface",
};

const solidStyles: Record<BadgeColor, string> = {
  primary: "bg-accent text-accent-fg",
  success: "bg-success text-white dark:text-[#04150d]",
  error: "bg-danger text-white dark:text-[#2a1110]",
  warning: "bg-warning text-white dark:text-[#2a1110]",
  info: "bg-info text-white dark:text-[#041820]",
  light: "bg-surface-muted text-fg",
  dark: "bg-fg text-surface",
};

const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
}) => {
  const colorStyles =
    variant === "solid" ? solidStyles[color] : lightStyles[color];

  return (
    <span
      className={`inline-flex items-center justify-center gap-1 rounded-full font-medium ${sizeStyles[size]} ${colorStyles}`}
    >
      {startIcon ? <span className="shrink-0">{startIcon}</span> : null}
      {children}
      {endIcon ? <span className="shrink-0">{endIcon}</span> : null}
    </span>
  );
};

export default Badge;
