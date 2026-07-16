// 📁 src/features/card/components/sections/LabelSection.tsx

import { useEffect, useRef, useState } from "react";

import { HexColorPicker } from "react-colorful";

import useLabels from "../../hooks/useLabels";

import { Card, Label } from "../../types";

interface Props {
  detail: Card | null;

  setDetail: React.Dispatch<
    React.SetStateAction<Card | null>
  >;
}

export default function LabelSection({
  detail,
  setDetail,
}: Props) {
  const {
    labels,

    newLabel,
    setNewLabel,

    newColor,
    setNewColor,

    handleCreateLabel,

    attach,
    detach,
  } = useLabels({
    detail,
    setDetail,
  });

  // ============================================
  // STATE
  // ============================================

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

  if (!detail) return null;

  // ============================================
  // HELPERS
  // ============================================

  const isAttached = (id: string) =>
    detail.labels?.some(
      (l: Label) => l.id === id
    );

  const paginatedLabels = labels.slice(
    0,
    page * PAGE_SIZE
  );

  const hasMore =
    paginatedLabels.length <
    labels.length;

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
  // UI
  // ============================================

  return (
    <div className="space-y-3">
      {/* CREATE */}

      <div className="space-y-2">
        {/* INPUT */}

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
          placeholder="Add label..."
          value={newLabel}
          onChange={(e) =>
            setNewLabel(e.target.value)
          }
        />

        {/* COLOR + BUTTON */}

        <div className="flex items-center gap-2">
          {/* PICKER */}

          <div className="relative" ref={pickerRef}>
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
                backgroundColor: newColor,
              }}
            />

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
                {/* PICKER */}

                <HexColorPicker
                  color={newColor}
                  onChange={setNewColor}
                  className="!w-full"
                />

                {/* HEX */}

                <input
                  value={newColor}
                  onChange={(e) =>
                    setNewColor(
                      e.target.value
                    )
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

                {/* PRESET */}

                <div className="flex flex-wrap gap-2">
                  {presetColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setNewColor(c)
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

          {/* BUTTON */}

          <button
            onClick={() => {
              // Tutup picker dulu supaya tidak menutupi list di bawahnya
              setOpenPicker(false);
              handleCreateLabel();
            }}
            className="
              flex-1
              h-9
              bg-blue-500
              hover:bg-blue-600
              text-white
              rounded
              text-sm
              transition
            "
          >
            Add Label
          </button>
        </div>
      </div>

      {/* LIST */}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {labels.length === 0 && (
          <div className="text-xs text-gray-400">
            No labels available
          </div>
        )}

        {paginatedLabels.map((label) => {
          const active = isAttached(
            label.id
          );

          return (
            <div
              key={label.id}
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
                      label.color ||
                      "#3b82f6",
                  }}
                />

                <span className="text-sm">
                  {label.name}
                </span>
              </div>

              {/* ACTION */}

              {active ? (
                <button
                  onClick={() =>
                    detach(label.id)
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
                    attach(label.id)
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