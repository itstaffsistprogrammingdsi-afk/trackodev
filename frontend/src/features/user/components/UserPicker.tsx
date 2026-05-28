import {
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";

import {
  Check,
  Search,
  X,
} from "lucide-react";

import type { User } from "@/features/user/types";

type Props = {
  users: User[];

  selected?: User | null;

  onSelect: (
    user: User | null
  ) => void;

  placeholder?: string;
};

export default function UserPicker({
  users,
  selected,
  onSelect,
  placeholder = "Cari user...",
}: Props) {
  const wrapperRef =
    useRef<HTMLDivElement>(null);

  const [query, setQuery] =
    useState("");

  const [open, setOpen] =
    useState(false);

  // ============================================
  // CLOSE OUTSIDE
  // ============================================

  useEffect(() => {
    const handleClickOutside = (
      e: MouseEvent
    ) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          e.target as Node
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // ============================================
  // FILTER USERS
  // ============================================

  const filteredUsers =
    useMemo(() => {
      return users.filter(
        (user) => {
          const keyword =
            query.toLowerCase();

          return (
            user.name
              ?.toLowerCase()
              .includes(
                keyword
              ) ||
            user.email
              ?.toLowerCase()
              .includes(
                keyword
              )
          );
        }
      );
    }, [users, query]);

  // ============================================
  // SELECT
  // ============================================

  const selectUser = (
    user: User
  ) => {
    onSelect(user);

    setQuery("");

    setOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      className="relative"
    >
      {/* SELECTED */}

      {selected && (
        <div
          className="
            mb-3
            flex
            items-center
            justify-between
            rounded-2xl
            border
            border-emerald-200
            bg-emerald-50
            px-4
            py-3
          "
        >
          <div>
            <p
              className="
                text-sm
                font-semibold
                text-emerald-700
              "
            >
              {selected.name}
            </p>

            <p
              className="
                text-xs
                text-zinc-500
              "
            >
              {selected.email}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onSelect(null)
            }
            className="
              rounded-xl
              p-2
              hover:bg-white
            "
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* INPUT */}

      <div className="relative">
        <Search
          size={16}
          className="
            absolute
            left-3
            top-1/2
            -translate-y-1/2
            text-zinc-400
          "
        />

        <input
          value={query}
          onFocus={() =>
            setOpen(true)
          }
          onChange={(e) => {
            setQuery(
              e.target.value
            );

            setOpen(true);
          }}
          placeholder={placeholder}
          className="
            w-full
            rounded-2xl
            border
            border-zinc-200
            bg-white
            py-3
            pl-10
            pr-4
            text-sm
            outline-none
            transition
            focus:border-indigo-500
            focus:ring-4
            focus:ring-indigo-100
          "
        />
      </div>

      {/* RESULTS */}

      {open && (
        <div
          className="
            absolute
            z-50
            mt-2
            max-h-72
            w-full
            overflow-y-auto
            rounded-2xl
            border
            border-zinc-200
            bg-white
            shadow-2xl
          "
        >
          {filteredUsers.length ===
            0 && (
            <div
              className="
                p-4
                text-sm
                text-zinc-500
              "
            >
              User tidak ditemukan
            </div>
          )}

          {filteredUsers.map(
            (user) => (
              <button
                key={user.id}
                type="button"
                onClick={() =>
                  selectUser(user)
                }
                className="
                  flex
                  w-full
                  items-center
                  justify-between
                  border-b
                  border-zinc-100
                  px-4
                  py-3
                  text-left
                  transition
                  hover:bg-zinc-50
                  last:border-b-0
                "
              >
                <div>
                  <p
                    className="
                      text-sm
                      font-medium
                      text-zinc-800
                    "
                  >
                    {user.name}
                  </p>

                  <p
                    className="
                      text-xs
                      text-zinc-500
                    "
                  >
                    {user.email}
                  </p>
                </div>

                {selected?.id ===
                  user.id && (
                  <Check
                    size={16}
                    className="text-emerald-600"
                  />
                )}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}