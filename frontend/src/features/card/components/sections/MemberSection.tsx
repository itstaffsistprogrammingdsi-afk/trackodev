import { useState } from "react";
import { User, ReceivingCampaign } from "../../types";
import { getReceivingCampaigns } from "../../api/card.api";

interface Props {
  cardId?: string;

  users: User[];

  memberSearch: string;

  assignees?: User[];

  setMemberSearch: (value: string) => void;

  handleAssign: (
    userId: string,
    targetCampaignId?: string,
    createOpts?: { createCampaign?: boolean; campaignName?: string },
  ) => unknown;

  handleUnassign: (userId: string) => void;
}

interface DestPicker {
  userId: string;
  userName: string;
  options: ReceivingCampaign[];
  selectedId: string;
}

interface CreatePanel {
  userId: string;
  userName: string;
  divisionName: string;
  suggestedName: string;
  campaignName: string;
}

export default function MemberSection({
  cardId,
  users,
  memberSearch,
  assignees = [],
  setMemberSearch,
  handleAssign,
  handleUnassign,
}: Props) {
  const [destPicker, setDestPicker] = useState<DestPicker | null>(null);
  const [createPanel, setCreatePanel] = useState<CreatePanel | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // =========================================
  // FILTER USERS
  // =========================================
const filteredUsers = users
  .filter((user) => {
    const keyword = memberSearch.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    return (
      user.name.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword)
    );
  })
  .slice(0, 10);

  const doAssign = async (
    userId: string,
    targetCampaignId?: string,
    createOpts?: { createCampaign?: boolean; campaignName?: string },
  ) => {
    setAssigning(true);
    try {
      const result = (await handleAssign(userId, targetCampaignId, createOpts)) as {
        copy_campaign?: { id: string; name: string; is_inbox?: boolean } | null;
      } | undefined;

      const dest = result?.copy_campaign;
      if (dest) {
        setNotice(
          dest.is_inbox
            ? "Copy dibuat di Inbox Lintas Divisi (tidak ada campaign yang cocok nama)."
            : `Copy dibuat di campaign ${dest.name}.`,
        );
      }
      setDestPicker(null);
      setCreatePanel(null);
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignClick = async (user: User) => {
    setNotice(null);

    // Satu divisi: langsung assign seperti biasa.
    if (!user.is_cross_division || !cardId) {
      await doAssign(user.id);
      return;
    }

    // Lintas divisi: cek campaign milik user lebih dulu.
    setPickerLoading(true);
    try {
      const { campaigns: options, suggested_name } = await getReceivingCampaigns(cardId, user.id);

      if (options.length === 0) {
        // Belum punya campaign: tawarkan buatkan campaign baru.
        setCreatePanel({
          userId: user.id,
          userName: user.name,
          divisionName: user.division_names?.[0] ?? "",
          suggestedName: suggested_name,
          campaignName: suggested_name,
        });
        return;
      }

      if (options.length === 1 && options[0].is_name_match) {
        // Hanya satu dan cocok nama (mis. Risa → Risa 2026): langsung.
        await doAssign(user.id, options[0].id);
        return;
      }

      // Lebih dari satu kandidat: pengassign memilih campaign tujuan.
      setDestPicker({
        userId: user.id,
        userName: user.name,
        options,
        selectedId: options.find((opt) => opt.is_name_match)?.id ?? options[0].id,
      });
    } finally {
      setPickerLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-sm space-y-5">
      {/* =========================================
          SEARCH
      ========================================= */}
      <div>
        <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">
          Member dapat ditugaskan lintas divisi. Copy otomatis masuk campaign miliknya yang cocok nama, atau ke Inbox Lintas Divisi bila tidak ada yang cocok.
        </div>
        <input
          type="text"
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
          placeholder="Search member..."
          className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {notice ? (
        <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-xs leading-5 text-green-700">
          {notice}
        </div>
      ) : null}

      {/* =========================================
          PILIH CAMPAIGN TUJUAN (lintas divisi)
      ========================================= */}
      {destPicker ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-violet-800">
            Pilih campaign tujuan untuk {destPicker.userName}
          </p>
          <select
            value={destPicker.selectedId}
            onChange={(e) => setDestPicker({ ...destPicker, selectedId: e.target.value })}
            className="w-full h-10 rounded-xl border border-violet-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {destPicker.options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
                {opt.is_name_match ? " (cocok nama)" : ""}
                {opt.division ? ` · ${opt.division.name}` : ""}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              disabled={assigning}
              onClick={() => {
                void doAssign(destPicker.userId, destPicker.selectedId);
              }}
              className="h-9 flex-1 rounded-xl bg-violet-600 px-3 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              {assigning ? "Menugaskan..." : "Assign ke campaign ini"}
            </button>
            <button
              disabled={assigning}
              onClick={() => setDestPicker(null)}
              className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
            >
              Batal
            </button>
          </div>
        </div>
      ) : null}

      {/* =========================================
          BUATKAN CAMPAIGN (belum punya campaign)
      ========================================= */}
      {createPanel ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-emerald-800">
            {createPanel.userName} belum punya campaign
            {createPanel.divisionName ? ` di ${createPanel.divisionName}` : ""}.
          </p>
          <p className="text-[11px] leading-4 text-emerald-700">
            Buatkan campaign personal agar copy langsung masuk ke sana?
          </p>
          <input
            type="text"
            value={createPanel.campaignName}
            onChange={(e) => setCreatePanel({ ...createPanel, campaignName: e.target.value })}
            placeholder={createPanel.suggestedName}
            className="w-full h-10 rounded-xl border border-emerald-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex gap-2">
            <button
              disabled={assigning || !createPanel.campaignName.trim()}
              onClick={() => {
                void doAssign(createPanel.userId, undefined, {
                  createCampaign: true,
                  campaignName: createPanel.campaignName.trim(),
                });
              }}
              className="h-9 flex-1 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {assigning ? "Membuat..." : "Buatkan & Assign"}
            </button>
            <button
              disabled={assigning}
              onClick={() => void doAssign(createPanel.userId)}
              className="h-9 rounded-xl border border-emerald-200 bg-white px-3 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
              title="Masuk ke Inbox Lintas Divisi"
            >
              Inbox saja
            </button>
            <button
              disabled={assigning}
              onClick={() => setCreatePanel(null)}
              className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
            >
              Batal
            </button>
          </div>
        </div>
      ) : null}

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
            Members (semua divisi)
          </p>

<span className="text-xs text-gray-400">
  Showing {filteredUsers.length} of {users.length} users
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

                    {user.division_names?.length ? (
                      <p className="truncate text-[11px] text-gray-400">
                        {user.division_names.join(" · ")}
                        {user.is_cross_division ? " · lintas divisi" : ""}
                      </p>
                    ) : (
                      <p className="truncate text-[11px] text-amber-500">
                        Belum terdaftar di division mana pun
                      </p>
                    )}
                  </div>
                </div>

                {/* RIGHT */}
                {assigned ? (
                  <div className="flex h-7 items-center rounded-md border border-green-100 bg-green-50 px-2.5 text-[11px] font-medium text-green-600">
                    Assigned
                  </div>
                ) : user.can_assign === false ? (
                  <span
                    className="text-[11px] font-medium text-gray-400"
                    title={
                      user.has_division === false
                        ? "User ini belum terdaftar pada division mana pun. Minta admin division untuk menambahkannya ke division lebih dulu."
                        : "User ini tidak dapat di-assign. Minta Super Admin untuk memeriksa izin assign Anda."
                    }
                  >
                    Hanya lihat
                  </span>
                ) : (
                  <button
                    disabled={pickerLoading || assigning}
                    onClick={() => void handleAssignClick(user)}
                    className="h-7 rounded-md border border-blue-100 bg-blue-50 px-2.5 text-[11px] font-medium text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
                  >
                    {pickerLoading ? "..." : "Assign"}
                  </button>
                )}
              </div>
            );
          })}

          {/* EMPTY */}
          {filteredUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white py-8 text-center text-sm text-gray-500">
              Member tidak ditemukan
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
