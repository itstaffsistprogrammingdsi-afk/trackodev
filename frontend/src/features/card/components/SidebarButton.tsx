import { ChevronDown } from "lucide-react";

interface Props {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  badge?: React.ReactNode;
  active?: boolean;
}

export default function SidebarButton({
  icon,
  label,
  onClick,
  badge,
  active = false,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`min-h-12 w-full rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98] md:min-h-0 md:border-0 md:bg-transparent md:px-3 md:py-2 md:text-slate-700 md:active:scale-100 md:hover:bg-gray-100 dark:md:bg-transparent dark:md:text-slate-200 dark:md:hover:bg-slate-800 ${
        active
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 transition-transform md:hidden ${active ? "rotate-180" : ""}`}
        />
      </div>

      {badge && (
        <div className="ml-6 mt-1 truncate text-[10px] font-medium text-slate-500 md:ml-7 md:text-[11px] dark:text-slate-400">
          {badge}
        </div>
      )}
    </button>
  );
}
