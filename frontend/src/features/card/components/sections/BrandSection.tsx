import { useEffect, useRef, useState } from "react";

import { HexColorPicker } from "react-colorful";

import { Card } from "../../types";
import { useCardBrand } from "../../hooks/useCardBrand";
import { useAuth } from '../../../../context/AuthContext';

interface Props {
  card: Card;
  isOpen: boolean;
  setDetail: React.Dispatch<
    React.SetStateAction<Card | null>
  >;
}

export default function BrandSection({
  card,
  isOpen,
  setDetail,
}: Props) {
  const { can } = useAuth();
  const {
    brands,
    attachBrand,
    detachBrand,
    createAndAttach,
    loading,
    error,
    fetchBrands,
  } = useCardBrand(card, isOpen, setDetail);

  // ============================================
  // STATE
  // ============================================

  const [name, setName] = useState("");

  const [color, setColor] =
    useState("#ff0000");

  const [openPicker, setOpenPicker] =
    useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 8;

  const [page, setPage] = useState(1);

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
  // GUARD
  // ============================================

  if (!isOpen) return null;

  // ============================================
  // HELPERS
  // ============================================

  const isAttached = (id: string) =>
    card.brands?.some((b) => b.id === id);

  const paginatedBrands = brands.slice(
    0,
    page * PAGE_SIZE
  );

  const hasMore =
    paginatedBrands.length < brands.length;

  // ============================================
  // PRESET COLORS
  // ============================================

  const presetColors = [
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

  // ============================================
  // CREATE BRAND
  // ============================================

  const handleCreate = async () => {
    if (!name.trim()) return;

    // Tutup picker dulu supaya tidak menutupi list di bawahnya
    setOpenPicker(false);

    try {
      await createAndAttach(name, color);

      setName("");
    } catch (err) {
      console.error(err);
    }
  };

  // ============================================
  // UI
  // ============================================

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 md:space-y-3 md:rounded-none md:border-0 md:bg-transparent md:p-0 dark:border-slate-700 dark:bg-slate-900/60 dark:md:bg-transparent">
      {/* CREATE */}

      {can('brand.create') && <div className="space-y-2">
        {/* BRAND NAME INPUT */}

        <input
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 md:h-9 md:rounded md:px-2 md:focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          placeholder="Nama brand baru"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
        />

        {/* COLOR + BUTTON */}

        <div className="flex items-center gap-2">
          {/* MODERN COLOR PICKER */}

          <div className="relative" ref={pickerRef}>
            {/* TRIGGER */}

            <button
              type="button"
              onClick={() =>
                setOpenPicker(!openPicker)
              }
              className="h-11 w-12 rounded-xl border border-slate-200 shadow-sm transition active:scale-95 md:h-9 md:w-10 md:rounded md:hover:scale-105 dark:border-slate-700"
              aria-label="Pilih warna brand"
              style={{
                backgroundColor: color,
              }}
            />

            {/* PICKER */}

            {openPicker && (
              <div
                className="
                  absolute
                  top-12 md:top-11
                  left-0
                  z-50
                  bg-white
                  border
                  rounded-xl
                  shadow-2xl
                  p-3
                  space-y-3
                  w-[min(240px,calc(100vw-3rem))] md:w-[240px]
                "
              >
                {/* PICKER UI */}

                <HexColorPicker
                  color={color}
                  onChange={setColor}
                  className="!w-full"
                />

                {/* HEX INPUT */}

                <input
                  value={color}
                  onChange={(e) =>
                    setColor(e.target.value)
                  }
                  className="
                    w-full
                    h-9
                    border
                    rounded
                    px-2
                    text-sm
                    font-mono
                    outline-none
                    focus:ring-2
                    focus:ring-blue-500
                  "
                />

                {/* PRESET COLORS */}

                <div className="flex flex-wrap gap-2">
                  {presetColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setColor(c)
                      }
                      className="
                        w-6
                        h-6
                        rounded-full
                        border
                        transition
                        hover:scale-110
                      "
                      style={{
                        backgroundColor: c,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ADD BUTTON */}

          <button
            disabled={loading}
            onClick={handleCreate}
            className="h-11 flex-1 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 md:h-9 md:rounded md:bg-blue-500 md:font-normal md:hover:bg-blue-600 md:active:scale-100"
          >
            {loading
              ? "Adding..."
              : "Add Brand"}
          </button>
        </div>
      </div>}

      {/* LIST */}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void fetchBrands()}
            className="mt-2 min-h-9 font-semibold underline underline-offset-2"
          >
            Coba lagi
          </button>
        </div>
      ) : null}

      <div className="max-h-72 space-y-2 overflow-y-auto overscroll-contain md:max-h-64">
        {loading && brands.length === 0 ? (
          <div className="py-5 text-center text-xs text-slate-500">
            Memuat brand...
          </div>
        ) : null}
        {brands.length === 0 && (
          <div className="text-xs text-gray-400">
            No brands available
          </div>
        )}

        {paginatedBrands.map((b) => {
          const active = isAttached(b.id);

          return (
            <div
              key={b.id}
              className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:border-slate-300 md:min-h-0 md:rounded md:border-0 md:bg-transparent md:p-2 md:hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:md:bg-transparent dark:md:hover:bg-slate-800"
            >
              {/* LEFT */}

              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      b.color,
                  }}
                />

                <span className="text-sm font-medium text-slate-700 md:font-normal dark:text-slate-200">
                  {b.name}
                </span>
              </div>

              {/* ACTION */}

              {active ? (can('brand.detach') &&
                <button
                  onClick={() =>
                    detachBrand(b.id)
                  }
                  className="min-h-9 rounded-lg bg-rose-50 px-3 text-xs font-semibold text-rose-600 md:min-h-0 md:rounded-none md:bg-transparent md:px-0 md:font-normal md:text-red-500 md:hover:underline dark:bg-rose-950/40 dark:text-rose-300 dark:md:bg-transparent"
                >
                  remove
                </button>
              ) : (can('brand.attach') &&
                <button
                  onClick={() =>
                    attachBrand(b.id)
                  }
                  className="min-h-9 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-600 md:min-h-0 md:rounded-none md:bg-transparent md:px-0 md:font-normal md:text-blue-500 md:hover:underline dark:bg-blue-950/40 dark:text-blue-300 dark:md:bg-transparent"
                >
                  add
                </button>
              )}
            </div>
          );
        })}

        {/* LOAD MORE */}

        {hasMore && (
          <button
            onClick={() =>
              setPage((p) => p + 1)
            }
            className="
              w-full
              text-xs
              text-blue-500
              py-2
              hover:underline
            "
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
