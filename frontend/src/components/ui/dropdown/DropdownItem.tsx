import type React from "react";
import { Link } from "react-router";

import { cn } from "@/lib/cn";

interface DropdownItemProps {
  tag?: "a" | "button";
  to?: string;
  onClick?: () => void;
  onItemClick?: () => void;
  baseClassName?: string;
  className?: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  children: React.ReactNode;
}

const defaultBaseClassName =
  "flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left text-sm text-fg-muted transition-colors duration-150 hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50";

export const DropdownItem: React.FC<DropdownItemProps> = ({
  tag = "button",
  to,
  onClick,
  onItemClick,
  baseClassName = defaultBaseClassName,
  className,
  icon,
  danger = false,
  disabled = false,
  type = "button",
  children,
}) => {
  const classes = cn(
    baseClassName,
    danger &&
      "text-danger hover:bg-danger-soft hover:text-danger focus-visible:ring-danger/30",
    className,
  );

  const content = (
    <>
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </>
  );

  const handleClick = (event: React.MouseEvent) => {
    if (tag === "button") {
      event.preventDefault();
    }
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.();
    onItemClick?.();
  };

  if (tag === "a" && to) {
    return (
      <Link to={to} className={classes} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={classes}
    >
      {content}
    </button>
  );
};
