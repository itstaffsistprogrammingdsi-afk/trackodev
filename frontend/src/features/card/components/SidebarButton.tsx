import { ChevronDown } from "lucide-react";

interface Props {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  badge?: React.ReactNode;
  expanded?: boolean;
}

export default function SidebarButton({
  icon,
  label,
  onClick,
  badge,
  expanded = false,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={`group flex min-h-10 w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left transition-colors duration-150 ${
        expanded ? "bg-surface-muted" : "hover:bg-surface-muted"
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-surface-muted text-fg-subtle transition-colors group-hover:text-fg">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-fg">
          {label}
        </span>
        {badge ? (
          <span className="mt-0.5 block truncate text-[11px] text-fg-subtle">
            {badge}
          </span>
        ) : null}
      </span>

      <div
        className={`shrink-0 text-fg-subtle transition-transform duration-150 ${
          expanded ? "rotate-180" : ""
        }`}
        aria-hidden="true"
      >
        <ChevronDown size={15} />
      </div>
    </button>
  );
}
