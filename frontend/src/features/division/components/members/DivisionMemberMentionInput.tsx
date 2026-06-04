import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Loader2,
  Search,
  UserPlus,
  Users,
} from "lucide-react";

import { searchUsers }
  from "@/features/user/api/user.api";

import type { User }
  from "@/features/user/types";

type Props = {
  onSelect: (
    user: User
  ) => Promise<void> | void;
};

export default function DivisionMemberMentionInput({
  onSelect,
}: Props) {
  const [query, setQuery] =
    useState("");

  const [users, setUsers] =
    useState<User[]>([]);

  const [show, setShow] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [addingId, setAddingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const wrapperRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target as Node
        )
      ) {
        setShow(false);
      }
    };

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setShow(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(
      async () => {
        const keyword =
          query.trim();

        if (!keyword) {
          setUsers([]);
          setShow(false);
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setError(null);

          const result =
            await searchUsers(
              keyword
            );

          setUsers(result ?? []);
          setShow(true);
        } catch {
          setError(
            "Failed to search users."
          );
        } finally {
          setLoading(false);
        }
      },
      400
    );

    return () =>
      clearTimeout(timer);
  }, [query]);

  const handleAdd =
    async (user: User) => {
      try {
        setAddingId(user.id);

        await onSelect(user);

        setQuery("");
        setUsers([]);
        setShow(false);
      } catch {
        setError(
          "Failed to add member."
        );
      } finally {
        setAddingId(null);
      }
    };

  return (
    <div
      ref={wrapperRef}
      className="relative"
    >
      <div className="space-y-2">
        <label
          className="
            block
            text-sm
            font-medium
            text-gray-700
          "
        >
          Add Member
        </label>

        <div className="relative">
          <Search
            size={18}
            className="
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              text-gray-400
            "
          />

          <input
            type="text"
            value={query}
            onChange={(e) =>
              setQuery(
                e.target.value
              )
            }
            placeholder="Search user by name or email..."
            className="
              w-full
              rounded-xl
              border
              border-gray-300
              bg-white
              py-3
              pl-10
              pr-4
              text-sm
              outline-none
              transition
              focus:border-blue-500
              focus:ring-2
              focus:ring-blue-500/20
            "
          />
        </div>
      </div>

      {show && (
        <div
          className="
            absolute
            left-0
            right-0
            z-50
            mt-2
            overflow-hidden
            rounded-xl
            border
            bg-white
            shadow-xl
          "
        >
          {loading && (
            <div
              className="
                flex
                items-center
                gap-2
                p-4
                text-sm
                text-gray-500
              "
            >
              <Loader2
                size={16}
                className="animate-spin"
              />

              Searching users...
            </div>
          )}

          {!loading &&
            error && (
              <div
                className="
                  p-4
                  text-sm
                  text-red-500
                "
              >
                {error}
              </div>
            )}

          {!loading &&
            !error &&
            users.length === 0 && (
              <div
                className="
                  flex
                  items-center
                  gap-2
                  p-5
                  text-sm
                  text-gray-500
                "
              >
                <Users size={16} />

                No users found.
              </div>
            )}

          {!loading &&
            !error &&
            users.length > 0 && (
              <div
                className="
                  max-h-80
                  overflow-y-auto
                "
              >
                {users.map(
                  (user) => (
                    <div
                      key={user.id}
                      className="
                        flex
                        items-center
                        justify-between
                        gap-4
                        border-b
                        p-4
                        last:border-b-0
                      "
                    >
                      <div
                        className="
                          min-w-0
                          flex-1
                        "
                      >
                        <p
                          className="
                            truncate
                            font-medium
                            text-gray-900
                          "
                        >
                          {user.name}
                        </p>

                        <p
                          className="
                            truncate
                            text-sm
                            text-gray-500
                          "
                        >
                          {user.email}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={
                          addingId ===
                          user.id
                        }
                        onClick={() =>
                          handleAdd(
                            user
                          )
                        }
                        className="
                          inline-flex
                          items-center
                          gap-2
                          rounded-lg
                          bg-blue-600
                          px-3
                          py-2
                          text-sm
                          font-medium
                          text-white
                          transition
                          hover:bg-blue-700
                          disabled:cursor-not-allowed
                          disabled:opacity-60
                        "
                      >
                        {addingId ===
                        user.id ? (
                          <>
                            <Loader2
                              size={14}
                              className="animate-spin"
                            />
                            Adding...
                          </>
                        ) : (
                          <>
                            <UserPlus
                              size={14}
                            />
                            Add
                          </>
                        )}
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}