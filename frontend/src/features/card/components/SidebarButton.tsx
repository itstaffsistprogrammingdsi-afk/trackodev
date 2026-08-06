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
      className="group flex min-h-12 w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3 text-left shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] dark:border-slate-700/80 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800/80"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-blue-500/10 dark:group-hover:text-blue-400">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </span>
        {badge ? (
          <span className="mt-0.5 block truncate text-[11px] text-slate-400 dark:text-slate-500">
            {badge}
          </span>
        ) : null}
      </span>

      <div
        className={`shrink-0 text-slate-400 transition-transform duration-200 ${
          expanded ? "rotate-180" : ""
        }`}
        aria-hidden="true"
      >
        <ChevronDown size={16} />
      </div>
    </button>
  );
}
