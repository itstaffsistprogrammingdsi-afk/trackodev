import { useLanguage } from "@/context/LanguageContext";

interface RequiredToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function RequiredToggle({
  checked,
  onChange,
  disabled = false,
}: RequiredToggleProps) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-4 rounded-card border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span>
        <span className="block text-sm font-medium text-fg">
          {t("Wajib diisi", "Required")}
        </span>
        <span
          className={`mt-0.5 block text-xs ${
            checked ? "text-accent" : "text-fg-muted"
          }`}
        >
          {checked
            ? t(
                "Responden wajib menjawab pertanyaan ini",
                "Respondents must answer this question",
              )
            : t(
                "Responden boleh melewati pertanyaan ini",
                "Respondents may skip this question",
              )}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        <span
          className={`text-[11px] ${
            checked ? "text-fg-subtle" : "font-semibold text-fg"
          }`}
        >
          {t("Tidak", "No")}
        </span>
        <span
          aria-hidden="true"
          className={`relative h-7 w-12 rounded-full border transition-colors ${
            checked
              ? "border-accent bg-accent"
              : "border-line-strong bg-line-strong group-hover:bg-line"
          }`}
        >
          <span
            className={`absolute top-0.5 h-[22px] w-[22px] rounded-full border border-black/5 bg-white shadow-e1 transition-transform duration-150 ease-soft ${
              checked ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </span>
        <span
          className={`text-[11px] ${
            checked ? "font-semibold text-accent" : "text-fg-subtle"
          }`}
        >
          {t("Ya", "Yes")}
        </span>
      </span>
    </button>
  );
}
