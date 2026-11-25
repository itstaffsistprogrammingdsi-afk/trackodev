import { useEffect, useId, useRef, useState } from "react";

import {
  PeopleSearchInput,
  PersonRow,
} from "@/components/ui/people-picker/PeoplePicker";
import { searchUsers } from "../api/campaign.api";
import type { User } from "../types";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  onSelect: (user: User) => void;
  collaboratorOnly?: boolean;
  workspaceId?: string;
  placeholder?: string;
};

export default function MemberMentionInput({
  onSelect,
  collaboratorOnly = false,
  workspaceId,
  placeholder,
}: Props) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!show) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShow(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show]);

  useEffect(() => {
    setActiveIndex(0);
  }, [users]);

  const handleChange = (value: string) => {
    setQuery(value);

    const requestId = ++requestIdRef.current;

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const keyword = value.replace("@", "").trim();

    if (!keyword.length) {
      setUsers([]);
      setShow(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setShow(true);

    debounceRef.current = window.setTimeout(async () => {
      try {
        const data = await searchUsers(
          keyword,
          collaboratorOnly,
          workspaceId,
        );

        if (requestId === requestIdRef.current) {
          setUsers(data);
          setShow(true);
        }
      } catch (error) {
        console.error(error);

        if (requestId === requestIdRef.current) {
          setUsers([]);
          setShow(false);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 300);
  };

  const handleSelect = (user: User) => {
    onSelect(user);

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    requestIdRef.current += 1;
    setQuery("");
    setUsers([]);
    setShow(false);
    setLoading(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setShow(false);
      return;
    }

    if (!show || users.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % users.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (index) => (index - 1 + users.length) % users.length,
      );
    } else if (event.key === "Enter") {
      const user = users[activeIndex];
      if (!user) return;
      event.preventDefault();
      handleSelect(user);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <PeopleSearchInput
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        loading={loading}
        placeholder={
          placeholder ??
          (collaboratorOnly
            ? t("Cari collaborator", "Search collaborators")
            : t("Cari user", "Search users"))
        }
        ariaLabel={
          collaboratorOnly
            ? t("Cari collaborator", "Search collaborators")
            : t("Cari user", "Search users")
        }
      />

      {show ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={t("Hasil pencarian anggota", "Member search results")}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto overscroll-contain rounded-card border border-line bg-surface p-1.5 shadow-e2"
        >
          {loading ? (
            <p className="px-2.5 py-3 text-xs text-fg-muted" role="status">
              {t("Mencari user…", "Searching users…")}
            </p>
          ) : users.length === 0 ? (
            <p className="px-2.5 py-3 text-xs text-fg-subtle">
              {t("Tidak ada user yang cocok.", "No matching users.")}
            </p>
          ) : (
            <div className="space-y-1">
              {users.map((user, index) => {
                const meta = [
                  user.collaborator_label,
                  user.division_names?.join(" · "),
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <PersonRow
                    key={user.id}
                    person={user}
                    meta={meta || undefined}
                    onClick={() => handleSelect(user)}
                    className={
                      index === activeIndex
                        ? "border-accent/30 bg-accent-soft/50"
                        : undefined
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
