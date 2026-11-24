import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder,
  onChange,
  className = "",
  defaultValue = "",
  id,
  name,
  disabled = false,
  "aria-label": ariaLabel,
}) => {
  const { t } = useLanguage();
  const resolvedPlaceholder = placeholder ?? t("Pilih opsi", "Select an option");
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedValue(value);
    onChange(value);
  };

  return (
    <div className={`relative ${className}`}>
      <select
        id={id}
        name={name}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`h-10 w-full cursor-pointer appearance-none rounded-control border border-line bg-surface pl-3 pr-9 text-sm outline-none transition-[border-color,box-shadow] duration-150 hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle ${
          selectedValue ? "text-fg" : "text-fg-subtle"
        }`}
        value={selectedValue}
        onChange={handleChange}
      >
        <option value="" disabled>
          {resolvedPlaceholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
      />
    </div>
  );
};

export default Select;
