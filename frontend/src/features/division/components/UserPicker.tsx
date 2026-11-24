import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Props {
  title: string;
  users: User[];
  selectedUsers: User[];
  onAdd: (user: User) => void;
  onRemove: (userId: string) => void;
  placeholder?: string;
  maxHeight?: string;
}

export default function UserPicker({
  title,
  users,
  selectedUsers,
  onAdd,
  onRemove,
  placeholder = "Cari nama atau email",
  maxHeight = "max-h-[280px]",
}: Props) {
  const [search, setSearch] = useState("");

  const selectedIds = useMemo(
    () => new Set(selectedUsers.map((user) => user.id)),
    [selectedUsers],
  );

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword),
    );
  }, [users, search]);

  return (
    <section className="space-y-3 rounded-panel border border-line bg-surface-muted/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-fg">{title}</h3>
        <span className="text-2xs font-medium text-fg-subtle">
          {selectedUsers.length} dipilih
        </span>
      </div>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={placeholder}
          aria-label={`${title}: cari pengguna`}
          className="h-9 w-full rounded-control border border-line bg-surface pl-9 pr-9 text-xs text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-subtle hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Hapus pencarian"
            className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[7px] text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {selectedUsers.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-2xs font-medium text-fg-subtle">Dipilih</p>
          <div className="space-y-1.5">
            {selectedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 rounded-control border border-accent/15 bg-accent-soft/50 px-2.5 py-2"
              >
                <UserIdentity user={user} tone="accent" />
                <button
                  type="button"
                  onClick={() => onRemove(user.id)}
                  aria-label={`Hapus ${user.name}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-fg-subtle transition-colors hover:bg-surface hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-2xs font-medium text-fg-subtle">Tersedia</p>

        <div className={`space-y-1.5 overflow-y-auto pr-0.5 ${maxHeight}`}>
          {filteredUsers.map((user) => {
            const selected = selectedIds.has(user.id);

            return (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 rounded-control border border-line bg-surface px-2.5 py-2"
              >
                <UserIdentity user={user} />

                {selected ? (
                  <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-2xs font-medium text-success">
                    Dipilih
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAdd(user)}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[7px] border border-line bg-surface px-2 text-2xs font-medium text-fg-muted transition-colors hover:border-accent/30 hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    <Plus aria-hidden="true" className="h-3 w-3" />
                    Tambah
                  </button>
                )}
              </div>
            );
          })}

          {filteredUsers.length === 0 ? (
            <div className="rounded-control border border-dashed border-line bg-surface px-3 py-8 text-center">
              <p className="text-xs font-medium text-fg">Pengguna tidak ditemukan</p>
              <p className="mt-1 text-2xs text-fg-muted">
                Coba kata kunci lain.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function UserIdentity({
  user,
  tone = "neutral",
}: {
  user: User;
  tone?: "neutral" | "accent";
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-2xs font-semibold ${
          tone === "accent"
            ? "bg-accent-soft text-accent"
            : "bg-surface-muted text-fg-muted"
        }`}
      >
        {user.name.charAt(0).toUpperCase()}
      </span>

      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-fg">{user.name}</p>
        <p className="truncate text-2xs text-fg-subtle">{user.email}</p>
      </div>
    </div>
  );
}
