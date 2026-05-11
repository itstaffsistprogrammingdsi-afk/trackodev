import { User } from "../../types";

interface Props {
  users: User[];

  memberSearch: string;

  assignees?: User[];

  setMemberSearch: (value: string) => void;

  handleAssign: (userId: string) => void;

  handleUnassign: (userId: string) => void;
}

export default function MemberSection({
  users,
  memberSearch,
  assignees = [],
  setMemberSearch,
  handleAssign,
  handleUnassign,
}: Props) {
  // =========================================
  // FILTER USERS
  // =========================================
  const filteredUsers = users.filter((user) => {
    const keyword = memberSearch.toLowerCase();

    return (
      user.name.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-sm space-y-5">
      {/* =========================================
          SEARCH
      ========================================= */}
      <div>
        <input
          type="text"
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
          placeholder="Search member..."
          className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* =========================================
          ASSIGNED MEMBERS
      ========================================= */}
      {assignees.length > 0 && (
        <div>
          {/* HEADER */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Assigned Members
            </p>

            <span className="text-xs text-gray-400">
              {assignees.length} members
            </span>
          </div>

          {/* LIST */}
          <div className="space-y-2">
            {assignees.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3"
              >
                {/* LEFT */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* AVATAR */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* USER INFO */}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {user.name}
                    </p>

                    <p className="truncate text-xs text-gray-500">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* ACTION */}
                <button
                  onClick={() => handleUnassign(user.id)}
                  className="h-8 shrink-0 rounded-lg bg-red-50 px-3 text-xs font-medium text-red-600 transition hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================
          AVAILABLE USERS
      ========================================= */}
      <div>
        {/* HEADER */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Available Members
          </p>

          <span className="text-xs text-gray-400">
            {filteredUsers.length} users
          </span>
        </div>

        {/* LIST */}
        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {filteredUsers.map((user) => {
            const assigned = assignees.some(
              (assignee) => assignee.id === user.id,
            );

            return (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 transition hover:border-gray-300"
              >
                {/* LEFT */}
                <div className="flex flex-1 items-center gap-3 min-w-0">
                  {/* AVATAR */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* USER INFO */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {user.name}
                    </p>

                    <p className="truncate text-[11px] text-gray-500">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* RIGHT */}
                {assigned ? (
                  <div className="flex h-7 items-center rounded-md border border-green-100 bg-green-50 px-2.5 text-[11px] font-medium text-green-600">
                    Assigned
                  </div>
                ) : (
                  <button
                    onClick={() => handleAssign(user.id)}
                    className="h-7 rounded-md border border-blue-100 bg-blue-50 px-2.5 text-[11px] font-medium text-blue-600 transition hover:bg-blue-100"
                  >
                    Assign
                  </button>
                )}
              </div>
            );
          })}

          {/* EMPTY */}
          {filteredUsers.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white py-8 text-center text-sm text-gray-500">
              Member tidak ditemukan
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
