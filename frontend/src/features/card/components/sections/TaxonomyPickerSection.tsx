import { useEffect, useMemo, useRef, useState } from "react";

import { HexColorPicker } from "react-colorful";
import { Check, Plus, Search, Trash2, X } from "lucide-react";

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
    <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-800/40">
      {/* ========================================= */}
      {/* TERPASANG */}
      {/* ========================================= */}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {attachedTitle}
          </p>

          <span className="text-xs text-slate-400 dark:text-slate-500">
            {attachedItems.length} terpasang
          </span>
        </div>

        {attachedItems.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {attachedEmptyText}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {attachedItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-2.5 pr-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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
                    aria-label={`Lepas ${item.name}`}
                    title="Lepas dari card"
                    className="rounded-full p-0.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/50"
                  >
                    <X size={13} />
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
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />

        {query !== "" && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Bersihkan pencarian"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400"
        >
          {error}
        </p>
      )}

      {/* ========================================= */}
      {/* DAFTAR */}
      {/* ========================================= */}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {listTitle}
          </p>

          <span className="text-xs text-slate-400 dark:text-slate-500">
            {loading && items.length === 0
              ? "Memuat..."
              : `Menampilkan ${paginated.length} dari ${filtered.length}`}
          </span>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto pr-0.5">
          {loading && items.length === 0
            ? [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="h-3 w-3 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-7 w-16 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
                </div>
              ))
            : paginated.map((item) => {
                const attached = attachedSet.has(item.id);
                const busy = busyId === item.id;
                const usedCount = item.cards_count ?? 0;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: item.color || fallbackColor,
                        }}
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                          {item.name}
                        </p>

                        {usedCount > 0 && (
                          <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                            Dipakai di {usedCount} card
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
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2.5 text-[11px] font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-400 dark:hover:bg-green-950/70"
                          >
                            <Check size={12} />
                            {busy ? "..." : "Terpasang"}
                          </button>
                        )
                      ) : canAttach ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void runBusy(item.id, () => onAttach(item.id))
                          }
                          className="h-7 rounded-md border border-blue-200 bg-blue-50 px-2.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-950/70"
                        >
                          {busy ? "..." : "Pasang"}
                        </button>
                      ) : null}

                      {canDelete &&
                        (confirmDeleteId === item.id ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-1 text-[11px] font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400">
                            Hapus?
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                void runBusy(item.id, () => onDelete(item.id));
                                setConfirmDeleteId(null);
                              }}
                              className="rounded px-1 font-bold hover:bg-rose-100 disabled:opacity-50 dark:hover:bg-rose-900/60"
                            >
                              Ya
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded px-1 hover:bg-rose-100 dark:hover:bg-rose-900/60"
                            >
                              Batal
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={usedCount > 0}
                            onClick={() => setConfirmDeleteId(item.id)}
                            title={
                              usedCount > 0
                                ? "Masih digunakan pada card"
                                : "Hapus dari daftar master"
                            }
                            aria-label={`Hapus ${item.name}`}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950/50"
                          >
                            <Trash2 size={14} />
                          </button>
                        ))}
                    </div>
                  </div>
                );
              })}

          {!loading && paginated.length === 0 && !showQuickCreate && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              {trimmedQuery !== ""
                ? `Tidak ada hasil untuk "${trimmedQuery}"`
                : "Belum ada data"}
            </div>
          )}

          {showQuickCreate && (
            <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50/60 px-3 py-3 text-center dark:border-blue-900/60 dark:bg-blue-950/30">
              <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">
                Tidak ada hasil untuk{" "}
                <span className="font-semibold">“{trimmedQuery}”</span>
              </p>

              <button
                type="button"
                disabled={busyId === "create"}
                onClick={() => void handleCreate(trimmedQuery)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus size={13} />
                {busyId === "create" ? "Membuat..." : `Buat "${trimmedQuery}"`}
              </button>
            </div>
          )}

          {hasMore && (
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="w-full py-2 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Muat lebih banyak
            </button>
          )}
        </div>
      </div>

      {/* ========================================= */}
      {/* BUAT BARU */}
      {/* ========================================= */}

      {canCreate && (
        <div className="border-t border-slate-200/80 pt-3 dark:border-slate-700/80">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Buat baru
          </p>

          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={createPlaceholder}
            aria-label={createPlaceholder}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />

          {duplicateNew && (
            <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
              {duplicateHint}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setOpenPicker(!openPicker)}
                aria-label="Pilih warna"
                className="h-10 w-10 rounded-xl border border-slate-200 shadow-sm transition hover:scale-105 dark:border-slate-700"
                style={{ backgroundColor: color }}
              />

              {openPicker && (
                <div className="absolute bottom-12 left-0 z-50 w-[240px] space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  <HexColorPicker
                    color={color}
                    onChange={setColor}
                    className="!w-full"
                  />

                  <input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    aria-label="Kode warna hex"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 font-mono text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />

                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        aria-label={`Warna ${c}`}
                        className="h-6 w-6 rounded-full border border-slate-200 transition hover:scale-110 dark:border-slate-700"
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
              className="h-10 flex-1 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyId === "create" ? "Menambahkan..." : "Tambah & pasang"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
