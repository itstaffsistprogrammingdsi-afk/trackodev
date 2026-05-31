import { useMemo, useState } from "react";

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
  placeholder = "Search user...",
  maxHeight = "max-h-[280px]",
}: Props) {
  const [search, setSearch] = useState("");

  const selectedIds = useMemo(
    () => new Set(selectedUsers.map((u) => u.id)),
    [selectedUsers]
  );

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase();

    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword)
      );
    });
  }, [users, search]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          {title}
        </h3>

        <span className="text-xs text-gray-500">
          {selectedUsers.length} selected
        </span>
      </div>

      {/* SEARCH */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* SELECTED */}
      {selectedUsers.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Selected
          </div>

          <div className="space-y-2">
            {selectedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-xl border border-green-200 bg-white px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-white text-xs font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {user.name}
                    </p>

                    <p className="truncate text-xs text-gray-500">
                      {user.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(user.id)}
                  className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AVAILABLE */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Available Users
        </div>

        <div className={`space-y-2 overflow-y-auto pr-1 ${maxHeight}`}>
          {filteredUsers.map((user) => {
            const selected = selectedIds.has(user.id);

            return (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {user.name}
                    </p>

                    <p className="truncate text-xs text-gray-500">
                      {user.email}
                    </p>
                  </div>
                </div>

                {selected ? (
                  <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-600">
                    Selected
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAdd(user)}
                    className="rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                  >
                    Add
                  </button>
                )}
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white py-6 text-center text-sm text-gray-500">
              No users found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}