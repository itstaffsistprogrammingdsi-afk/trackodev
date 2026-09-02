import { useEffect, useRef, useState } from "react";

import { HexColorPicker } from "react-colorful";
import { Trash2 } from "lucide-react";

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
    removeBrand,
    loading,
    error,
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

  const campaignId = card.campaign_id
    ?? card.campaign?.id
    ?? card.board?.campaign_id;
  const normalizedName = name.trim().toLocaleLowerCase();
  const duplicateBrand = normalizedName !== "" && brands.some(
    (brand) =>
      brand.campaign_id === campaignId
      && brand.name.trim().toLocaleLowerCase() === normalizedName,
  );

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
    <div className="space-y-3">
      {/* CREATE */}

      {can('brand.create') && <div className="space-y-2">
        {/* BRAND NAME INPUT */}

        <input
          className="
            w-full
            h-9
            border
            rounded
            px-2
            text-sm
            outline-none
            focus:ring-2
            focus:ring-blue-500
          "
          placeholder="Add brand..."
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          aria-invalid={duplicateBrand}
        />

        {duplicateBrand && (
          <p className="text-xs text-amber-600">
            Brand sudah ada pada campaign ini. Pilih brand tersebut dari daftar untuk memasangnya.
          </p>
        )}

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
              className="
                w-10
                h-9
                rounded
                border
                shadow-sm
                transition
                hover:scale-105
              "
              style={{
                backgroundColor: color,
              }}
            />

            {/* PICKER */}

            {openPicker && (
              <div
                className="
                  absolute
                  top-11
                  left-0
                  z-50
                  bg-white
                  border
                  rounded-xl
                  shadow-2xl
                  p-3
                  space-y-3
                  w-[240px]
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
            disabled={loading || duplicateBrand}
            onClick={handleCreate}
            className="
              flex-1
              h-9
              bg-blue-500
              hover:bg-blue-600
              disabled:opacity-50
              text-white
              rounded
              text-sm
              transition
            "
          >
            {loading
              ? "Adding..."
              : "Add Brand"}
          </button>
        </div>
      </div>}

      {error && (
        <p role="alert" className="rounded bg-red-50 px-2 py-1.5 text-xs text-red-600">
          {error}
        </p>
      )}

      {/* LIST */}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {brands.length === 0 && (
          <div className="text-xs text-gray-400">
            No brands available
          </div>
        )}

        {paginatedBrands.map((b) => {
          const active = isAttached(b.id);
          const isUsed = (b.cards_count ?? 0) > 0;
          return (
            <div
              key={b.id}
              className="
                flex
                items-center
                justify-between
                p-2
                rounded
                hover:bg-gray-100
                transition
              "
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

                <span className="text-sm">
                  {b.name}
                </span>
              </div>

              {/* ACTION */}

              <div className="flex items-center gap-2">
                {active ? (can('brand.detach') &&
                  <button
                    onClick={() =>
                      detachBrand(b.id)
                    }
                    className="
                      text-red-500
                      text-xs
                      hover:underline
                    "
                  >
                    remove
                  </button>
                ) : (can('brand.attach') &&
                  <button
                    onClick={() =>
                      attachBrand(b.id)
                    }
                    className="
                      text-blue-500
                      text-xs
                      hover:underline
                    "
                  >
                    add
                  </button>
                )}

                {can('brand.delete') && (
                  <button
                    type="button"
                    disabled={isUsed}
                    onClick={() => removeBrand(b.id, b.name)}
                    title={isUsed ? "Brand masih digunakan pada card" : "Hapus brand dari daftar master"}
                    aria-label={`Hapus brand ${b.name}`}
                    className="rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
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
