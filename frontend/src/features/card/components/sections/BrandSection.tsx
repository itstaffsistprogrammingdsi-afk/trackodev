import { useState } from "react";

import { HexColorPicker } from "react-colorful";

import { Card } from "../../types";
import { useCardBrand } from "../../hooks/useCardBrand";

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
  const {
    brands,
    attachBrand,
    detachBrand,
    createAndAttach,
    loading,
  } = useCardBrand(card, isOpen, setDetail);

  // ============================================
  // STATE
  // ============================================

  const [name, setName] = useState("");

  const [color, setColor] =
    useState("#ff0000");

  const [openPicker, setOpenPicker] =
    useState(false);

  const PAGE_SIZE = 8;

  const [page, setPage] = useState(1);

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

  const handleCreate = () => {
    if (!name.trim()) return;

    createAndAttach(name, color);

    setName("");
  };

  // ============================================
  // UI
  // ============================================

  return (
    <div className="space-y-3">
      {/* CREATE */}

      <div className="space-y-2">
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
        />

        {/* COLOR + BUTTON */}

        <div className="flex items-center gap-2">
          {/* MODERN COLOR PICKER */}

          <div className="relative">
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
            disabled={loading}
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
      </div>

      {/* LIST */}

      <div className="space-y-2 max-h-64 overflow-y-auto">
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

              {active ? (
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
              ) : (
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