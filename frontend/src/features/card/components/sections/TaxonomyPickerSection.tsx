import { useEffect, useMemo, useRef, useState } from "react";

import { HexColorPicker } from "react-colorful";
import { Check, Plus, Search, Trash2, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export interface TaxonomyItem {
  id: string;
  name: string;
  color?: string | null;
  cards_count?: number | null;
}

interface Props {
  items: TaxonomyItem[];
  attachedIds: string[];
  loading: boolean;
  error: string | null;

  searchPlaceholder: string;
  createPlaceholder: string;
  attachedTitle: string;
  attachedEmptyText: string;
  listTitle: string;
  duplicateHint: string;

  canCreate: boolean;
  canAttach: boolean;
  canDetach: boolean;
  canDelete: boolean;

  defaultColor: string;
  fallbackColor: string;

  isDuplicateName: (name: string) => boolean;

  onAttach: (id: string) => Promise<void> | void;
  onDetach: (id: string) => Promise<void> | void;
  onCreate: (name: string, color: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

const PAGE_SIZE = 8;

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
  "#111827",
];

export default function TaxonomyPickerSection({
  items,
  attachedIds,
  loading,
  error,
  searchPlaceholder,
  createPlaceholder,
  attachedTitle,
  attachedEmptyText,
  listTitle,
  duplicateHint,
  canCreate,
  canAttach,
  canDetach,
  canDelete,
  defaultColor,
  fallbackColor,
  isDuplicateName,
  onAttach,
  onDetach,
  onCreate,
  onDelete,
}: Props) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [newName, setNewName] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [openPicker, setOpenPicker] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const pickerRef = useRef<HTMLDivElement>(null);

  // ============================================
  // DERIVED
  // ============================================

  const attachedSet = useMemo(
    () => new Set(attachedIds),
    [attachedIds],
  );

  const attachedItems = useMemo(
    () => items.filter((item) => attachedSet.has(item.id)),
    [items, attachedSet],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();

    if (!q) return items;

    return items.filter((item) =>
      item.name.toLocaleLowerCase().includes(q),
    );
  }, [items, query]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const trimmedQuery = query.trim();
  const showQuickCreate =
    canCreate && trimmedQuery !== "" && filtered.length === 0;

  const duplicateNew = newName.trim() !== "" && isDuplicateName(newName);

  // Reset pagination supaya hasil filter tidak "kosong" karena page lama.
  useEffect(() => {
    setPage(1);
  }, [query]);

  // ============================================
  // CLOSE PICKER ON OUTSIDE CLICK
  // ============================================

  useEffect(() => {
    if (!openPicker) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      ) {
        setOpenPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [openPicker]);

  // ============================================
  // ACTIONS (dengan status sibuk per item)
  // ============================================

  const runBusy = async (id: string, fn: () => Promise<void> | void) => {
    setBusyId(id);

    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (name: string) => {
    if (!name.trim()) return;

    // Jalur form "Buat baru": cegah duplikat. Jalur cepat dari hasil
    // pencarian kosong tidak mungkin duplikat (tidak ada yang cocok).
    if (name === newName && duplicateNew) return;

    setOpenPicker(false);

    await runBusy("create", () => onCreate(name.trim(), color));

    if (name === newName) setNewName("");
    if (name === trimmedQuery) setQuery("");
  };

  // ============================================
  // UI
  // ============================================

  return (
    <div className="space-y-3.5 rounded-card border border-line bg-surface-muted/40 p-3">
      {/* ========================================= */}
      {/* TERPASANG */}
      {/* ========================================= */}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium text-fg-subtle">
            {attachedTitle}
          </p>

          <span className="text-2xs tabular-nums text-fg-subtle">
            {t("{count} terpasang", "{count} attached", {
              count: attachedItems.length,
            })}
          </span>
        </div>

        {attachedItems.length === 0 ? (
          <p className="text-xs text-fg-subtle">
            {attachedEmptyText}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {attachedItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-2.5 pr-1.5 text-[11px] font-medium text-fg-muted"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color || fallbackColor }}
                />

                <span className="truncate">{item.name}</span>

                {canDetach && (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void runBusy(item.id, () => onDetach(item.id))}
                    aria-label={t("Lepas {name}", "Detach {name}", { name: item.name })}
                    title={t("Lepas dari card", "Detach from card")}
                    className="rounded-full p-0.5 text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* CARI */}
      {/* ========================================= */}

      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle"
          aria-hidden="true"
        />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-9 w-full rounded-control border border-line bg-surface pl-8 pr-8 text-xs text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/15"
        />

        {query !== "" && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={t("Bersihkan pencarian", "Clear search")}
            className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-control bg-danger-soft px-2.5 py-2 text-xs text-danger"
        >
          {error}
        </p>
      )}

      {/* ========================================= */}
      {/* DAFTAR */}
      {/* ========================================= */}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium text-fg-subtle">
            {listTitle}
          </p>

          <span className="text-2xs tabular-nums text-fg-subtle">
            {loading && items.length === 0
              ? t("Memuat…", "Loading…")
              : t("Menampilkan {shown} dari {total}", "Showing {shown} of {total}", {
                  shown: paginated.length,
                  total: filtered.length,
                })}
          </span>
        </div>

        <div className="custom-scrollbar max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
          {loading && items.length === 0
            ? [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-control border border-line bg-surface px-2.5 py-2.5"
                >
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-surface-muted motion-reduce:animate-none" />
                  <div className="h-3 flex-1 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
                  <div className="h-6 w-14 animate-pulse rounded-[7px] bg-surface-muted motion-reduce:animate-none" />
                </div>
              ))
            : paginated.map((item) => {
                const attached = attachedSet.has(item.id);
                const busy = busyId === item.id;
                const usedCount = item.cards_count ?? 0;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2.5 rounded-control border border-line bg-surface px-2.5 py-2 transition-colors hover:border-line-strong"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: item.color || fallbackColor,
                        }}
                      />

                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-fg">
                          {item.name}
                        </p>

                        {usedCount > 0 && (
                          <p className="truncate text-2xs text-fg-subtle">
                            {t("Dipakai di {count} card", "Used in {count} cards", {
                              count: usedCount,
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {attached ? (
                        canDetach && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void runBusy(item.id, () => onDetach(item.id))
                            }
                            className="inline-flex h-7 items-center gap-1 rounded-[7px] bg-success-soft px-2 text-2xs font-medium text-success transition-colors hover:bg-success/15 disabled:opacity-50"
                          >
                            <Check size={11} />
                            {busy ? "…" : t("Terpasang", "Attached")}
                          </button>
                        )
                      ) : canAttach ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void runBusy(item.id, () => onAttach(item.id))
                          }
                          className="h-7 rounded-[7px] bg-accent-soft px-2 text-2xs font-medium text-accent transition-colors hover:bg-accent/15 disabled:opacity-50"
                        >
                          {busy ? "…" : t("Pasang", "Attach")}
                        </button>
                      ) : null}

                      {canDelete &&
                        (confirmDeleteId === item.id ? (
                          <span className="inline-flex items-center gap-1 rounded-[7px] bg-danger-soft px-1.5 py-1 text-2xs font-medium text-danger">
                            {t("Hapus?", "Delete?")}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                void runBusy(item.id, () => onDelete(item.id));
                                setConfirmDeleteId(null);
                              }}
                              className="rounded px-1 font-medium hover:bg-danger/15 disabled:opacity-50"
                            >
                              {t("Ya", "Yes")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded px-1 hover:bg-danger/15"
                            >
                              {t("Batal", "Cancel")}
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={usedCount > 0}
                            onClick={() => setConfirmDeleteId(item.id)}
                            title={
                              usedCount > 0
                                ? t("Masih digunakan pada card", "Still used on cards")
                                : t("Hapus dari daftar master", "Delete from master list")
                            }
                            aria-label={t("Hapus {name}", "Delete {name}", { name: item.name })}
                            className="flex h-7 w-7 items-center justify-center rounded-[7px] text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Trash2 size={13} />
                          </button>
                        ))}
                    </div>
                  </div>
                );
              })}

          {!loading && paginated.length === 0 && !showQuickCreate && (
            <div className="rounded-control border border-dashed border-line bg-surface py-6 text-center text-xs text-fg-subtle">
              {trimmedQuery !== ""
                ? t("Tidak ada hasil untuk “{query}”", "No results for “{query}”", {
                    query: trimmedQuery,
                  })
                : t("Belum ada data", "No data yet")}
            </div>
          )}

          {showQuickCreate && (
            <div className="rounded-control border border-dashed border-accent/30 bg-accent-soft/50 px-2.5 py-2.5 text-center">
              <p className="mb-2 text-xs text-fg-muted">
                {t("Tidak ada hasil untuk", "No results for")}{" "}
                <span className="font-medium text-fg">“{trimmedQuery}”</span>
              </p>

              <button
                type="button"
                disabled={busyId === "create"}
                onClick={() => void handleCreate(trimmedQuery)}
                className="inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-accent px-2.5 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-50"
              >
                <Plus size={12} />
                {busyId === "create"
                  ? t("Membuat…", "Creating…")
                  : t('Buat "{name}"', 'Create "{name}"', { name: trimmedQuery })}
              </button>
            </div>
          )}

          {hasMore && (
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="w-full py-1.5 text-xs font-medium text-accent transition-colors hover:text-accent-strong"
            >
              {t("Muat lebih banyak", "Load more")}
            </button>
          )}
        </div>
      </div>

      {/* ========================================= */}
      {/* BUAT BARU */}
      {/* ========================================= */}

      {canCreate && (
        <div className="border-t border-line pt-3">
          <p className="mb-2 text-[11px] font-medium text-fg-subtle">
            {t("Buat baru", "Create new")}
          </p>

          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={createPlaceholder}
            aria-label={createPlaceholder}
            className="h-9 w-full rounded-control border border-line bg-surface px-2.5 text-xs text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/15"
          />

          {duplicateNew && (
            <p className="mt-1.5 text-xs text-warning">
              {duplicateHint}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setOpenPicker(!openPicker)}
                aria-label={t("Pilih warna", "Select color")}
                className="h-9 w-9 rounded-control border border-line transition-transform hover:scale-105"
                style={{ backgroundColor: color }}
              />

              {openPicker && (
                <div className="absolute bottom-12 left-0 z-50 w-[240px] space-y-3 rounded-card border border-line bg-surface p-3 shadow-e2">
                  <HexColorPicker
                    color={color}
                    onChange={setColor}
                    className="!w-full"
                  />

                  <input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    aria-label={t("Kode warna hex", "Hex color code")}
                    className="h-8 w-full rounded-[7px] border border-line bg-surface px-2 font-mono text-xs text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />

                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        aria-label={t("Warna {color}", "Color {color}", { color: c })}
                        className="h-6 w-6 rounded-full border border-line transition-transform hover:scale-110"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={busyId === "create" || !newName.trim() || duplicateNew}
              onClick={() => void handleCreate(newName)}
              className="h-9 flex-1 rounded-control bg-accent px-3 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyId === "create" ? t("Menambahkan…", "Adding…") : t("Tambah & pasang", "Add & attach")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
