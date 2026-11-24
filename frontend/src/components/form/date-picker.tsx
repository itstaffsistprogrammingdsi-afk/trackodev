import { useEffect } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import Label from "./Label";
import { CalenderIcon } from "../../icons";
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  label?: string;
  placeholder?: string;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
}: PropsType) {
  useEffect(() => {
    const flatPickr = flatpickr(`#${id}`, {
      mode: mode || "single",
      static: true,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      defaultDate,
      onChange,
    });

    return () => {
      if (!Array.isArray(flatPickr)) {
        flatPickr.destroy();
      }
    };
  }, [mode, onChange, id, defaultDate]);

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          id={id}
          placeholder={placeholder}
          className="h-11 w-full rounded-control border appearance-none px-4 py-2.5 text-sm shadow-e1 placeholder:text-fg-subtle focus:outline-none focus:ring-2  dark:bg-surface text-fg dark:placeholder:text-white/30  bg-transparent text-fg border-line-strong focus:border-accent focus:ring-accent/15 dark:border-line-strong  dark:focus:border-accent"
        />

        <span className="absolute text-fg-muted -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-fg-subtle">
          <CalenderIcon className="size-6" />
        </span>
      </div>
    </div>
  );
}
