import type { KeyboardEventHandler, ReactNode } from "react";
import { Loader2, Search, X } from "lucide-react";

import Avatar from "@/components/ui/avatar/Avatar";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/cn";
import { resolveStorageUrl } from "@/lib/storageUrl";

export type PickerPerson = {
  id: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
  division_names?: string[];
};

type PeopleSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
};

export function PeopleSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  loading = false,
  disabled = false,
  autoFocus = false,
  className,
  onKeyDown,
}: PeopleSearchInputProps) {
  const { t } = useLanguage();
  const resolvedPlaceholder =
    placeholder ?? t("Cari nama atau email", "Search name or email");
  const resolvedAriaLabel = ariaLabel ?? t("Cari anggota", "Search members");

  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle"
      />

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={resolvedPlaceholder}
        aria-label={resolvedAriaLabel}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        className="h-9 w-full rounded-control border border-line bg-surface pl-8 pr-8 text-xs text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle"
      />

      {loading ? (
        <Loader2
          aria-hidden="true"
          className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-fg-subtle motion-reduce:animate-none"
        />
      ) : value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("Hapus pencarian", "Clear search")}
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

type PersonRowProps = {
  person: PickerPerson;
  meta?: ReactNode;
  action?: ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
};

export function PersonRow({
  person,
  meta,
  action,
  disabled = false,
  className,
  onClick,
}: PersonRowProps) {
  const { t } = useLanguage();

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      aria-label={
        onClick
          ? t("Pilih {name}", "Select {name}", { name: person.name })
          : undefined
      }
      onClick={disabled ? undefined : onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (!disabled) onClick();
              }
            }
          : undefined
      }
      className={cn(
        "flex items-center justify-between gap-2.5 rounded-control border border-line bg-surface px-2.5 py-2 transition-colors",
        disabled ? "opacity-60" : "hover:border-line-strong",
        onClick &&
          !disabled &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Avatar
          src={person.avatar ? resolveStorageUrl(person.avatar) : null}
          name={person.name}
          alt={t("Avatar {name}", "Avatar {name}", { name: person.name })}
          size="small"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-fg">{person.name}</p>

          {person.email ? (
            <p className="truncate text-2xs text-fg-subtle">{person.email}</p>
          ) : null}

          {meta ? (
            <div className="truncate text-2xs text-fg-subtle">{meta}</div>
          ) : person.division_names?.length ? (
            <p className="truncate text-2xs text-fg-subtle">
              {person.division_names.join(" · ")}
            </p>
          ) : null}
        </div>
      </div>

      {action ? (
        <div
          className="shrink-0"
          onClick={(event) => {
            if (onClick) event.stopPropagation();
          }}
        >
          {action}
        </div>
      ) : null}
    </div>
  );
}
