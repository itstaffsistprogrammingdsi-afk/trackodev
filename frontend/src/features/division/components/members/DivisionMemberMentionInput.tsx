import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Loader2,
  UserPlus,
  Users,
} from "lucide-react";

import {
  PeopleSearchInput,
  PersonRow,
} from "@/components/ui/people-picker/PeoplePicker";
import { useLanguage } from "@/context/LanguageContext";

import { searchUsers }
  from "@/features/user/api/user.api";

import type { User }
  from "@/features/user/types";

type Props = {
  onSelect: (
    user: User
  ) => Promise<void> | void;

  role?: "admin" | "member";
};

export default function DivisionMemberMentionInput({
  onSelect,
  role = "member",
}: Props) {
  const { t, language } = useLanguage();
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

  const requestIdRef =
    useRef(0);

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
    const requestId = ++requestIdRef.current;
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

          if (requestId !== requestIdRef.current) return;

          const candidates = result ?? [];
          const filteredCandidates = role === "admin"
            ? candidates.filter((user) =>
                user.roles?.some((candidateRole) =>
                  ["admin", "manager", "super_admin"].includes(candidateRole.toLowerCase())
                )
              )
            : candidates;

          setUsers(filteredCandidates);
          setShow(true);
        } catch {
          if (requestId !== requestIdRef.current) return;
          setError(
            t(
              "Gagal mencari user. Coba lagi.",
              "Failed to search users. Try again.",
            )
          );
        } finally {
          if (requestId === requestIdRef.current) {
            setLoading(false);
          }
        }
      },
      400
    );

    return () =>
      clearTimeout(timer);
  }, [language, query, role, t]);

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
          t(
            "Gagal menambahkan anggota.",
            "Failed to add member."
          )
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
        <PeopleSearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("Cari nama atau email", "Search name or email")}
          ariaLabel={t(
            "Cari user untuk ditambahkan",
            "Search users to add"
          )}
        />
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
            rounded-card
            border
            border-line
            bg-surface
            shadow-e2
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
                text-fg-muted
              "
            >
              <Loader2
                size={14}
                className="animate-spin motion-reduce:animate-none"
              />

              {t("Mencari user…", "Searching users…")}
            </div>
          )}

          {!loading &&
            error && (
              <div
                className="
                  p-4
                  text-sm
                  text-danger
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
                  text-fg-muted
                "
              >
                <Users size={16} aria-hidden="true" />

                {t("Tidak ada user yang cocok.", "No matching users.")}
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
                {users.map((user) => {
                  const busy = addingId === user.id;

                  return (
                    <PersonRow
                      key={user.id}
                      person={user}
                      className="rounded-none border-0 border-b border-line px-2.5 last:border-b-0 hover:bg-surface-muted/50"
                      action={
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleAdd(user)}
                          className="inline-flex h-7 items-center gap-1.5 rounded-[7px] bg-accent-soft px-2.5 text-2xs font-medium text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy ? (
                            <Loader2
                              size={11}
                              className="animate-spin motion-reduce:animate-none"
                            />
                          ) : (
                            <UserPlus size={11} />
                          )}
                          {busy
                            ? t("Menambah…", "Adding…")
                            : t("Tambah", "Add")}
                        </button>
                      }
                    />
                  );
                })}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
