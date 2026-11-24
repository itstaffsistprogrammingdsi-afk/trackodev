import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

import {
  PeopleSearchInput,
  PersonRow,
} from "@/components/ui/people-picker/PeoplePicker";
import { useLanguage } from "@/context/LanguageContext";

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
  placeholder,
  maxHeight = "max-h-[280px]",
}: Props) {
  const { t } = useLanguage();
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
          {t("{count} dipilih", "{count} selected", {
            count: selectedUsers.length,
          })}
        </span>
      </div>

      <PeopleSearchInput
        value={search}
        onChange={setSearch}
        placeholder={placeholder ?? t("Cari nama atau email", "Search name or email")}
        ariaLabel={t("{title}: cari pengguna", "{title}: search users", {
          title,
        })}
      />

      {selectedUsers.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-2xs font-medium text-fg-subtle">
            {t("Dipilih", "Selected")}
          </p>
          <div className="space-y-1.5">
            {selectedUsers.map((user) => (
              <PersonRow
                key={user.id}
                person={user}
                className="border-accent/15 bg-accent-soft/50"
                action={
                  <button
                    type="button"
                    onClick={() => onRemove(user.id)}
                    aria-label={t("Hapus {name}", "Remove {name}", {
                      name: user.name,
                    })}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-fg-subtle transition-colors hover:bg-surface hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
                  >
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-2xs font-medium text-fg-subtle">
          {t("Tersedia", "Available")}
        </p>

        <div className={`space-y-1.5 overflow-y-auto pr-0.5 ${maxHeight}`}>
          {filteredUsers.map((user) => {
            const selected = selectedIds.has(user.id);

            return (
              <PersonRow
                key={user.id}
                person={user}
                action={
                  selected ? (
                    <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-2xs font-medium text-success">
                      {t("Dipilih", "Selected")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAdd(user)}
                      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[7px] border border-line bg-surface px-2 text-2xs font-medium text-fg-muted transition-colors hover:border-accent/30 hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <Plus aria-hidden="true" className="h-3 w-3" />
                      {t("Tambah", "Add")}
                    </button>
                  )
                }
              />
            );
          })}

          {filteredUsers.length === 0 ? (
            <div className="rounded-control border border-dashed border-line bg-surface px-3 py-8 text-center">
              <p className="text-xs font-medium text-fg">
                {t("Pengguna tidak ditemukan", "No users found")}
              </p>
              <p className="mt-1 text-2xs text-fg-muted">
                {t("Coba kata kunci lain.", "Try another keyword.")}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
