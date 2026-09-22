import { Globe, User } from "lucide-react";

export type DashboardScope = "global" | "me";

interface Props {
  value: DashboardScope;
  onChange: (value: DashboardScope) => void;
  isSuperAdmin: boolean;
}

/**
 * Segmented toggle untuk memilih cakupan dashboard.
 * Pengganti <select> scope yang kecil dan kurang jelas.
 */
export default function ScopeToggle({ value, onChange, isSuperAdmin }: Props) {
  const options: Array<{
    value: DashboardScope;
    label: string;
    description: string;
    Icon: typeof Globe;
  }> = [
    {
      value: "global",
      label: isSuperAdmin ? "Global View" : "Division View",
      description: isSuperAdmin ? "Seluruh sistem" : "Ringkasan divisi Anda",
      Icon: Globe,
    },
    {
      value: "me",
      label: "My Workspace",
      description: "Ruang kerja Anda",
      Icon: User,
    },
  ];

  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      role="radiogroup"
      aria-label="Cakupan dashboard"
      className="relative grid w-full grid-cols-2 rounded-2xl border border-gray-200 bg-gray-100 p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:w-auto"
    >
      {/* Indicator meluncur */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-white shadow-theme-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] dark:bg-gray-900"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />

      {options.map(({ value: optionValue, label, description, Icon }) => {
        const active = optionValue === value;

        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(optionValue)}
            className={`relative z-10 flex items-center justify-center gap-2.5 rounded-xl px-4 py-2 text-left transition-colors duration-200 ${
              active
                ? "text-brand-600 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Icon size={18} className="shrink-0" aria-hidden="true" />

            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-4">
                {label}
              </span>
              <span className="block truncate text-[11px] leading-4 opacity-70">
                {description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
