import { useState } from "react";
import { useNavigate } from "react-router";

import {
  PeopleSearchInput,
  PersonRow,
} from "@/components/ui/people-picker/PeoplePicker";
import { AssignTarget, User, ReceivingCampaign } from "../../types";
import { getBoardReceivingCampaigns, getReceivingCampaigns } from "../../api/card.api";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  cardId?: string;

  boardId?: string;

  users: User[];

  memberSearch: string;

  assignees?: User[];

  setMemberSearch: (value: string) => void;

  handleAssign: (
    userId: string,
    targetCampaignId?: string,
    createOpts?: { createCampaign?: boolean; campaignName?: string; forceInbox?: boolean },
  ) => unknown;

  handleUnassign: (userId: string) => void;

  onCloseModal?: () => void;

  /** Mode form buat-card: simpan pilihan campaign per user untuk dikirim saat create. */
  assigneeTargets?: Record<string, AssignTarget>;

  onTargetChange?: (userId: string, target: AssignTarget | null) => void;
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

interface DestInfo {
  name: string;
  isInbox: boolean;
  campaignId: string;
  workspaceId?: string | null;
}

export default function MemberSection({
  cardId,
  boardId,
  users,
  memberSearch,
  assignees = [],
  setMemberSearch,
  handleAssign,
  handleUnassign,
  onCloseModal,
  assigneeTargets,
  onTargetChange,
}: Props) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [destPicker, setDestPicker] = useState<DestPicker | null>(null);
  const [createPanel, setCreatePanel] = useState<CreatePanel | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [destInfo, setDestInfo] = useState<DestInfo | null>(null);

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
    target?: { campaignId?: string; campaignName?: string; createName?: string; forceInbox?: boolean },
  ) => {
    setAssigning(true);
    try {
      const result = (await handleAssign(
        userId,
        target?.campaignId,
        target?.createName
          ? { createCampaign: true, campaignName: target.createName }
          : target?.forceInbox
            ? { forceInbox: true }
            : undefined,
      )) as {
        copy_campaign?: {
          id: string;
          name: string;
          is_inbox?: boolean;
          workspace_id?: string | null;
        } | null;
      } | undefined;

      // Mode form buat-card (belum ada card): simpan pilihan untuk dikirim
      // bersama request create.
      if (!cardId) {
        onTargetChange?.(userId, target?.campaignId || target?.createName || target?.forceInbox ? {
          campaignId: target.campaignId,
          campaignName: target.campaignName,
          createName: target.createName,
          forceInbox: target.forceInbox,
        } : null);
      }

      const dest = result?.copy_campaign;
      if (dest) {
        setDestInfo({
          name: dest.name,
          isInbox: !!dest.is_inbox,
          campaignId: dest.id,
          workspaceId: dest.workspace_id ?? null,
        });
      }
      setDestPicker(null);
      setCreatePanel(null);
    } finally {
      setAssigning(false);
    }
  };

  const goToDestCampaign = () => {
    if (!destInfo?.workspaceId || !destInfo?.campaignId) return;
    onCloseModal?.();
    navigate(`/workspaces/${destInfo.workspaceId}/campaigns/${destInfo.campaignId}/boards`);
  };

  const handleAssignClick = async (user: User) => {
    setDestInfo(null);

    // Satu divisi (atau tanpa konteks board/card): langsung seperti biasa.
    if (!user.is_cross_division || (!cardId && !boardId)) {
      await doAssign(user.id);
      return;
    }

    // Lintas divisi: cek campaign milik user lebih dulu.
    setPickerLoading(true);
    try {
      const { campaigns: options, suggested_name } = cardId
        ? await getReceivingCampaigns(cardId, user.id)
        : await getBoardReceivingCampaigns(boardId as string, user.id);

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

      // Selalu tampilkan pilihan agar tidak salah alamat: preselect yang
      // cocok nama, dengan opsi eksplisit Inbox Lintas Divisi.
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
    <div className="space-y-4">
      {/* =========================================
          SEARCH
      ========================================= */}
      <div>
        <div className="mb-2.5 rounded-control border border-info/15 bg-info-soft px-2.5 py-2 text-[11px] leading-4 text-info">
          {t(
            "Anggota bisa ditugaskan lintas divisi. Salinan otomatis masuk ke campaign yang cocok namanya, atau ke Inbox Lintas Divisi.",
            "Members can be assigned across divisions. A copy automatically goes to the campaign with a matching name, or to the Cross-division Inbox.",
          )}
        </div>
        <PeopleSearchInput
          value={memberSearch}
          onChange={setMemberSearch}
          placeholder={t("Cari nama atau email", "Search name or email")}
          ariaLabel={t("Cari anggota", "Search members")}
        />
      </div>

      {destInfo ? (
        <div className="space-y-2 rounded-control border border-success/15 bg-success-soft px-2.5 py-2">
          <p className="text-[11px] leading-4 text-success">
            {destInfo.isInbox
              ? t(
                  "Salinan dibuat di Inbox Lintas Divisi karena tidak ada campaign yang cocok.",
                  "The copy was created in the Cross-division Inbox because no matching campaign was found.",
                )
              : t(
                  "Salinan dibuat di campaign {name}.",
                  "The copy was created in campaign {name}.",
                  { name: destInfo.name },
                )}
          </p>
          {destInfo.workspaceId ? (
            <button
              type="button"
              onClick={goToDestCampaign}
              className="inline-flex h-8 items-center rounded-[7px] bg-success px-2.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              {t("Lihat campaign", "View campaign")}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* =========================================
          PILIH CAMPAIGN TUJUAN (lintas divisi)
      ========================================= */}
      {destPicker ? (
        <div className="space-y-2 rounded-control border border-accent/20 bg-accent-soft/60 p-2.5">
          <p className="text-[11px] font-medium text-accent-strong">
            {t(
              "Pilih campaign tujuan untuk {name}",
              "Select a destination campaign for {name}",
              { name: destPicker.userName },
            )}
          </p>
          <select
            value={destPicker.selectedId}
            onChange={(e) => setDestPicker({ ...destPicker, selectedId: e.target.value })}
            aria-label={t("Campaign tujuan", "Destination campaign")}
            className="h-9 w-full rounded-[7px] border border-accent/20 bg-surface px-2.5 text-xs text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
          >
            <option value="__inbox__">{t("Inbox Lintas Divisi", "Cross-division Inbox")}</option>
            {destPicker.options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
                {opt.is_name_match ? t(" (cocok nama)", " (name match)") : ""}
                {opt.division ? ` · ${opt.division.name}` : ""}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              disabled={assigning}
              onClick={() => {
                if (destPicker.selectedId === "__inbox__") {
                  void doAssign(destPicker.userId, { forceInbox: true });
                  return;
                }
                const selected = destPicker.options.find((opt) => opt.id === destPicker.selectedId);
                void doAssign(destPicker.userId, {
                  campaignId: destPicker.selectedId,
                  campaignName: selected?.name,
                });
              }}
              className="h-8 flex-1 rounded-[7px] bg-accent px-2.5 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-50"
            >
              {assigning ? t("Menugaskan…", "Assigning…") : t("Tugaskan ke campaign ini", "Assign to this campaign")}
            </button>
            <button
              disabled={assigning}
              onClick={() => setDestPicker(null)}
              className="h-8 rounded-[7px] border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              {t("Batal", "Cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {/* =========================================
          BUATKAN CAMPAIGN (belum punya campaign)
      ========================================= */}
      {createPanel ? (
        <div className="space-y-2 rounded-control border border-warning/20 bg-warning-soft p-2.5">
          <p className="text-[11px] font-medium text-warning">
            {createPanel.divisionName
              ? t(
                  "{name} belum punya campaign di {division}.",
                  "{name} has no campaign in {division} yet.",
                  { name: createPanel.userName, division: createPanel.divisionName },
                )
              : t(
                  "{name} belum punya campaign.",
                  "{name} has no campaign yet.",
                  { name: createPanel.userName },
                )}
          </p>
          <p className="text-[11px] leading-4 text-fg-muted">
            {t(
              "Buat campaign personal agar salinan langsung masuk ke sana.",
              "Create a personal campaign so the copy goes straight there.",
            )}
          </p>
          <input
            type="text"
            value={createPanel.campaignName}
            onChange={(e) => setCreatePanel({ ...createPanel, campaignName: e.target.value })}
            placeholder={createPanel.suggestedName}
            aria-label={t("Nama campaign baru", "New campaign name")}
            className="h-9 w-full rounded-[7px] border border-warning/25 bg-surface px-2.5 text-xs text-fg outline-none focus:border-warning focus:ring-2 focus:ring-warning/15"
          />
          <div className="flex gap-2">
            <button
              disabled={assigning || !createPanel.campaignName.trim()}
              onClick={() => {
                void doAssign(createPanel.userId, {
                  createName: createPanel.campaignName.trim(),
                });
              }}
              className="h-8 flex-1 rounded-[7px] bg-accent px-2.5 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-50"
            >
              {assigning ? t("Membuat…", "Creating…") : t("Buat & tugaskan", "Create & assign")}
            </button>
            <button
              disabled={assigning}
              onClick={() => void doAssign(createPanel.userId)}
              className="h-8 rounded-[7px] border border-warning/25 bg-surface px-2.5 text-xs font-medium text-warning transition-colors hover:bg-warning-soft disabled:opacity-50"
              title={t("Masuk ke Inbox Lintas Divisi", "Go to Cross-division Inbox")}
            >
              {t("Inbox")}
            </button>
            <button
              disabled={assigning}
              onClick={() => setCreatePanel(null)}
              className="h-8 rounded-[7px] border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              {t("Batal", "Cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {/* =========================================
          ASSIGNED MEMBERS
      ========================================= */}
      {assignees.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-fg-subtle">
              {t("Ditugaskan", "Assigned")}
            </p>
            <span className="text-2xs tabular-nums text-fg-subtle">
              {t("{count} anggota", "{count} members", { count: assignees.length })}
            </span>
          </div>

          <div className="space-y-1.5">
            {assignees.map((user) => (
              <PersonRow
                key={user.id}
                person={user}
                action={
                  <button
                    onClick={() => {
                      handleUnassign(user.id);
                      onTargetChange?.(user.id, null);
                    }}
                    className="h-7 shrink-0 rounded-[7px] px-2 text-2xs font-medium text-danger transition-colors hover:bg-danger-soft"
                  >
                    {t("Lepas", "Remove")}
                  </button>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* =========================================
          AVAILABLE USERS
      ========================================= */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-fg-subtle">
            {t("Anggota dari semua divisi", "Members from all divisions")}
          </p>

          <span className="text-2xs tabular-nums text-fg-subtle">
            {t("{shown} dari {total}", "{shown} of {total}", {
              shown: filteredUsers.length,
              total: users.length,
            })}
          </span>
        </div>

        <div className="custom-scrollbar max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
          {filteredUsers.map((user) => {
            const assigned = assignees.some(
              (assignee) => assignee.id === user.id,
            );
            const saved = assigneeTargets?.[user.id];
            const divisionMeta = user.division_names?.length
              ? `${user.division_names.join(" · ")}${
                  user.is_cross_division
                    ? ` · ${t("lintas divisi", "cross-division")}`
                    : ""
                }`
              : t("Belum terdaftar di divisi mana pun", "Not registered in any division");
            const savedMeta =
              saved && (saved.campaignId || saved.createName || saved.forceInbox)
                ? saved.forceInbox
                  ? ` → ${t("Inbox Lintas Divisi", "Cross-division Inbox")}`
                  : saved.createName
                    ? ` → ${t("buatkan: {name}", "create: {name}", {
                        name: saved.createName,
                      })}`
                    : ` → ${
                        saved.campaignName ??
                        t("campaign terpilih", "selected campaign")
                      }`
                : "";

            return (
              <PersonRow
                key={user.id}
                person={user}
                meta={`${divisionMeta}${savedMeta}`}
                disabled={user.can_assign === false}
                action={
                  assigned ? (
                    <span className="flex h-7 shrink-0 items-center rounded-full bg-success-soft px-2.5 text-2xs font-medium text-success">
                      {t("Ditugaskan", "Assigned")}
                    </span>
                  ) : user.can_assign === false ? (
                    <span
                      className="shrink-0 text-2xs font-medium text-fg-subtle"
                      title={
                        user.has_division === false
                          ? t(
                              "User ini belum terdaftar pada divisi mana pun. Minta admin divisi untuk menambahkannya lebih dulu.",
                              "This user is not registered in any division yet. Ask the division admin to add them first.",
                            )
                          : t(
                              "User ini tidak dapat ditugaskan. Minta Super Admin untuk memeriksa izin assign Anda.",
                              "This user cannot be assigned. Ask a Super Admin to check your assign permission.",
                            )
                      }
                    >
                      {t("Hanya lihat", "View only")}
                    </span>
                  ) : (
                    <button
                      disabled={pickerLoading || assigning}
                      onClick={() => void handleAssignClick(user)}
                      className="h-7 shrink-0 rounded-[7px] bg-accent-soft px-2.5 text-2xs font-medium text-accent transition-colors hover:bg-accent/15 disabled:opacity-50"
                    >
                      {pickerLoading ? "…" : t("Tugaskan", "Assign")}
                    </button>
                  )
                }
              />
            );
          })}

          {/* EMPTY */}
          {filteredUsers.length === 0 ? (
            <div className="rounded-control border border-dashed border-line py-6 text-center text-xs text-fg-subtle">
              {t("Anggota tidak ditemukan", "No members found")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
