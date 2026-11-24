import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { CornerDownLeft, Search } from "lucide-react";

import { cn } from "@/lib/cn";
import { useLanguage } from "@/context/LanguageContext";

export interface CommandPaletteItem {
  id: string;
  label: string;
  path: string;
  group?: string;
  icon?: ReactNode;
}

interface CommandPaletteProps {
  open: boolean;
  items: CommandPaletteItem[];
  onClose: () => void;
  onNavigate?: () => void;
}

export default function CommandPalette({
  open,
  items,
  onClose,
  onNavigate,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;

    return items.filter((item) =>
      `${item.label} ${item.group ?? ""}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [items, query]);

  useEffect(() => {
    if (!open) return;

    setQuery("");
    setActiveIndex(0);

    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const select = (item: CommandPaletteItem) => {
    navigate(item.path);
    onClose();
    onNavigate?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        filtered.length === 0 ? 0 : (index + 1) % filtered.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        filtered.length === 0
          ? 0
          : (index - 1 + filtered.length) % filtered.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const item = filtered[activeIndex];
      if (item) select(item);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-overlay px-4 pt-[10vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Cari menu", "Search menu")}
        onClick={(event) => event.stopPropagation()}
        style={{ animation: "ui-scale-in 160ms ease-out" }}
        className="w-full max-w-lg overflow-hidden rounded-panel border border-line bg-surface shadow-e3"
      >
        <div className="relative flex h-12 items-center border-b border-line">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 h-4 w-4 text-fg-subtle"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t(
              "Cari menu atau halaman…",
              "Search menus or pages…",
            )}
            aria-label={t("Cari menu", "Search menu")}
            className="h-full w-full bg-transparent pl-11 pr-16 text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
          <kbd className="absolute right-3 rounded border border-line bg-surface-muted px-1.5 py-0.5 text-2xs text-fg-subtle">
            Esc
          </kbd>
        </div>

        <div className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-fg">
                {t("Menu tidak ditemukan", "No menu found")}
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                {t(
                  "Coba kata kunci lain atau periksa hak akses Anda.",
                  "Try another keyword or check your access.",
                )}
              </p>
            </div>
          ) : (
            <ul
              role="listbox"
              aria-label={t("Hasil pencarian menu", "Menu search results")}
            >
              {filtered.map((item, index) => {
                const active = index === activeIndex;

                return (
                  <li key={item.id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => select(item)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-card px-2.5 py-2 text-left transition-colors",
                        active
                          ? "bg-surface-muted text-fg"
                          : "text-fg-muted hover:bg-surface-muted/60",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-control [&_svg]:h-4 [&_svg]:w-4",
                          active
                            ? "bg-accent-soft text-accent"
                            : "bg-surface-muted text-fg-subtle",
                        )}
                      >
                        {item.icon}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {item.label}
                        </span>
                        {item.group ? (
                          <span className="mt-0.5 block truncate text-2xs text-fg-subtle">
                            {item.group}
                          </span>
                        ) : null}
                      </span>

                      {active ? (
                        <CornerDownLeft
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0 text-fg-subtle"
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-2 text-2xs text-fg-subtle">
          <span>{t("Navigasi cepat Tracko", "Tracko quick navigation")}</span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-line bg-surface-muted px-1.5 py-0.5">
              ↑↓
            </kbd>
            {t("pilih", "select")}
            <kbd className="rounded border border-line bg-surface-muted px-1.5 py-0.5">
              ↵
            </kbd>
            {t("buka", "open")}
          </span>
        </div>
      </div>
    </div>
  );
}
