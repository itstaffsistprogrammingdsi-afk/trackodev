import { Globe, User } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

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
  const { t } = useLanguage();
  const options: Array<{
    value: DashboardScope;
    label: string;
    description: string;
    Icon: typeof Globe;
  }> = [
    {
      value: "global",
      label: isSuperAdmin ? t("Global View") : t("Division View"),
      description: isSuperAdmin
        ? t("Seluruh sistem", "Entire system")
        : t("Ringkasan divisi Anda", "Your division summary"),
      Icon: Globe,
    },
    {
      value: "me",
      label: t("My Workspace"),
      description: t("Ruang kerja Anda", "Your workspace"),
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
      aria-label={t("Cakupan dashboard", "Dashboard scope")}
      className="relative grid w-full grid-cols-2 rounded-control border border-line bg-surface-muted p-1 sm:w-auto"
    >
      {/* Indicator meluncur */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-[7px] bg-surface shadow-e1 transition-transform duration-200 ease-soft"
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
            className={`relative z-10 flex items-center justify-center gap-2 rounded-[7px] px-3.5 py-1.5 text-left transition-colors duration-150 ${
              active
                ? "text-fg"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            <Icon size={16} className="shrink-0" aria-hidden="true" />

            <span className="min-w-0">
              <span className="block truncate text-xs font-medium leading-4">
                {label}
              </span>
              <span className="block truncate text-[10px] leading-4 text-fg-subtle">
                {description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
