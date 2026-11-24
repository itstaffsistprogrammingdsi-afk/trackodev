import { Campaign, Member,  } from "../types";
import { Link, useNavigate, useParams } from "react-router";
import { useState, useMemo } from "react";
import { AxiosError } from "axios";
import {
  deleteCampaign,
  updateCampaign,
  addMember,
  removeMember,
  getMembers,
  getCampaignMoveTargets,
  moveCampaign,
} from "../api/campaign.api"; // ⚠️ sesuaikan path ini dengan lokasi campaign.api.ts di project kamu
import MemberMentionInput from "./MemberMentionInput";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Pencil, Trash2, X, Check, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { PersonRow } from "@/components/ui/people-picker/PeoplePicker";
import { toast, confirmDialog } from "@/lib/feedback";

export default function CampaignCard({
  campaign,
  onChanged,
}: {
  campaign: Campaign;
  onChanged?: () => void;
}) {  const { workspaceId } = useParams<{
    workspaceId: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t, locale } = useLanguage();

  const [showMembers, setShowMembers] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  const [moveTargetId, setMoveTargetId] = useState("");
  const [confirmCrossDivision, setConfirmCrossDivision] = useState(false);
  const [moving, setMoving] = useState(false);

  const isSuperAdmin = user?.roles?.includes("super_admin") ?? false;
  const isAdmin = user?.roles?.some((role) => ["admin", "manager"].includes(role)) ?? false;

  const [name, setName] = useState(campaign.name ?? "");
  const [description, setDescription] = useState(campaign.description ?? "");
  const [dueDate, setDueDate] = useState<Date | null>(
    campaign.due_date ? new Date(campaign.due_date) : null,
  );

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof AxiosError) {
      return err.response?.data?.message || fallback;
    }
    return fallback;
  };

  // ================= MEMBERS QUERY =================
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["campaign-members", campaign.id],
    queryFn: () => getMembers(campaign.id),
    initialData: campaign.members ?? [],
    refetchOnMount: true,
    staleTime: 0,
  });

  // ================= STATUS DUE DATE =================
  const dueStatus = useMemo(() => {
    if (!campaign.due_date) return null;

    const now = new Date();
    const due = new Date(campaign.due_date);

    const isExpired = due.getTime() < now.setHours(0, 0, 0, 0);

    return {
      date: due.toISOString().split("T")[0],
      isExpired,
    };
  }, [campaign.due_date]);

  // ================= DELETE =================
  const handleDeleteCampaign = async () => {
    if (
      !(await confirmDialog({
        message: t("Yakin ingin menghapus campaign ini?", "Delete this campaign?"),
        variant: "danger",
      }))
    )
      return;

    try {
      setLoading(true);

      await deleteCampaign(campaign.id);

      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });

      onChanged?.();
    } catch (err) {
      toast.error(
        getErrorMessage(err, t("Gagal menghapus campaign", "Failed to delete campaign")),
      );
    } finally {
      setLoading(false);
    }
  };

  // ================= UPDATE =================
  const handleUpdateCampaign = async () => {
    try {
      setLoading(true);

      await updateCampaign(campaign.id, {
        name,
        description,
        due_date: dueDate ? dueDate.toISOString().split("T")[0] : null,
      });

      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });

      onChanged?.();
      setShowEdit(false);
    } catch (err) {
      toast.error(
        getErrorMessage(err, t("Gagal update campaign", "Failed to update campaign")),
      );
    } finally {
      setLoading(false);
    }
  };

  // ================= MOVE WORKSPACE =================
  const { data: moveTargets = [], isLoading: loadingTargets } = useQuery({
    queryKey: ["campaign-move-targets", campaign.id],
    queryFn: () => getCampaignMoveTargets(campaign.id),
    enabled: showMove,
    staleTime: 0,
  });

  const selectedMoveTarget = useMemo(
    () => moveTargets.find((target) => target.id === moveTargetId) ?? null,
    [moveTargets, moveTargetId],
  );

  const handleMoveCampaign = async () => {
    if (!moveTargetId) return;

    if (
      selectedMoveTarget?.is_cross_division &&
      !confirmCrossDivision &&
      !isSuperAdmin
    ) {
      toast.info(
        t(
          "Centang konfirmasi untuk memindahkan campaign lintas divisi.",
          "Tick the confirmation to move a campaign across divisions.",
        ),
      );
      return;
    }

    try {
      setMoving(true);

      const res = await moveCampaign(
        campaign.id,
        moveTargetId,
        confirmCrossDivision,
      );

      onChanged?.();
      setShowMove(false);

      // Pindah SUDAH berhasil pada titik ini. Kegagalan refresh daftar tidak
      // boleh dilaporkan sebagai kegagalan pemindahan.
      try {
        await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        await queryClient.invalidateQueries({
          queryKey: ["campaign-move-targets", campaign.id],
        });
      } catch {
        // abaikan; data sudah tersimpan di server
      }

      toast.success(
        t(
          'Campaign "{name}" berhasil dipindahkan ke workspace "{workspace}".',
          'Campaign "{name}" moved to workspace "{workspace}".',
          {
            name: campaign.name,
            workspace: res.summary.target_workspace_name,
          },
        ),
      );

      // Navigate hanya bila aktor memang masih punya akses ke workspace tujuan.
      // Jika tidak, tetap di halaman ini agar tidak menabrak halaman 403.
      if (res.summary.can_access_target !== false) {
        navigate(`/workspaces/${moveTargetId}/campaigns`);
      } else {
        toast.info(
          t(
            "Anda tidak memiliki akses ke workspace tujuan. Minta admin workspace tersebut untuk memberi akses bila perlu memantau campaign ini.",
            "You don't have access to the target workspace. Ask that workspace's admin for access if you need to monitor this campaign.",
          ),
        );
      }
    } catch (err) {
      toast.error(
        getErrorMessage(err, t("Gagal memindahkan campaign", "Failed to move campaign")),
      );
    } finally {
      setMoving(false);
    }
  };

  // ================= MEMBERS =================
  const handleSelectUser = (user: Member) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id) ? prev : [...prev, user],
    );
  };

  const removeSelectedUser = (id: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleAddMembers = async () => {
    if (!selectedUsers.length) return;

    try {
      setLoading(true);

      const failed: string[] = [];
      let successCount = 0;

      // Proses per orang agar hasilnya jujur: sebagian bisa berhasil.
      for (const user of selectedUsers) {
        try {
          await addMember(campaign.id, user.id);
          successCount += 1;
        } catch (err) {
          failed.push(
            `${user.name}: ${getErrorMessage(err, t("gagal", "failed"))}`,
          );
        }
      }

      setSelectedUsers([]);
      setShowMembers(false);

      try {
        await queryClient.invalidateQueries({
          queryKey: ["campaign-members", campaign.id],
        });
      } catch {
        // abaikan; daftar bisa di-refresh manual
      }

      if (failed.length === 0) {
        toast.success(
          t("{count} member berhasil ditambahkan.", "{count} members added.", {
            count: successCount,
          }),
        );
      } else if (successCount === 0) {
        toast.error(
          t("Gagal menambahkan member. {errors}", "Failed to add members. {errors}", {
            errors: failed.join("; "),
          }),
        );
      } else {
        toast.warning(
          t(
            "{success} berhasil, {failed} gagal — {errors}",
            "{success} succeeded, {failed} failed — {errors}",
            { success: successCount, failed: failed.length, errors: failed.join("; ") },
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (
      !(await confirmDialog({
        message: t("Yakin hapus member?", "Remove this member?"),
        variant: "danger",
      }))
    )
      return;

    try {
      setLoading(true);

      await removeMember(campaign.id, id);

      await queryClient.invalidateQueries({
        queryKey: ["campaign-members", campaign.id],
      });
    } catch (err) {
      toast.error(
        getErrorMessage(err, t("Gagal hapus member", "Failed to remove member")),
      );
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  return (
    <article className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong">
      {/* HEADER */}
      <header className="space-y-1">
        <Link
          to={`/workspaces/${workspaceId}/campaigns/${campaign.id}/boards`}
          className="group/link inline-flex items-center gap-1"
        >
          <h3 className="text-sm font-semibold text-fg transition-colors group-hover/link:text-accent">
            {name}
          </h3>
        </Link>

        <p className="line-clamp-2 text-xs leading-5 text-fg-muted">
          {description || t("Belum ada deskripsi.", "No description yet.")}
        </p>
      </header>

      {/* META */}
      <section className="flex flex-wrap items-center gap-2">
        {dueStatus && (
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
              dueStatus.isExpired
                ? "border-danger/25 bg-danger-soft text-danger"
                : "border-line bg-surface-muted text-fg-muted"
            }`}
          >
            {dueStatus.isExpired ? t("Terlambat", "Overdue") : t("Deadline")}{" "}
            {new Date(campaign.due_date ?? "").toLocaleDateString(locale, {
              day: "2-digit",
              month: "short",
            })}
          </span>
        )}
      </section>

      {/* ACTIONS */}
      <footer className="flex items-center gap-1 border-t border-line pt-3">
        {campaign.type ? (
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-fg-muted">
            {campaign.type}
          </span>
        ) : null}

        <button
          onClick={() => setShowMembers(true)}
          className="flex h-8 w-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
          title={t(
            "Kelola {count} anggota campaign",
            "Manage {count} campaign members",
            { count: members.length },
          )}
          aria-label={t(
            "Kelola {count} anggota campaign {name}",
            "Manage {count} campaign members {name}",
            { count: members.length, name },
          )}
        >
          <Users size={15} />
        </button>

        <button
          onClick={() => setShowEdit(true)}
          className="flex h-8 w-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
          title={t("Edit campaign")}
          aria-label={t("Edit {name}", "Edit {name}", { name })}
        >
          <Pencil size={15} />
        </button>

        <button
          onClick={() => setShowMove(true)}
          className="flex h-8 w-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
          title={t("Pindah workspace", "Move workspace")}
          aria-label={t(
            "Pindahkan {name} ke workspace lain",
            "Move {name} to another workspace",
            { name },
          )}
        >
          <ArrowRightLeft size={15} />
        </button>

        <button
          onClick={handleDeleteCampaign}
          disabled={loading}
          className="flex h-8 w-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
          title={t("Hapus campaign", "Delete campaign")}
          aria-label={t("Hapus {name}", "Delete {name}", { name })}
        >
          <Trash2 size={15} />
        </button>

        <Link
          to={`/workspaces/${workspaceId}/campaigns/${campaign.id}`}
          className="ml-auto text-xs font-medium text-accent transition-colors hover:text-accent-strong"
        >
          {t("Detail", "Details")}
        </Link>
      </footer>

      {/* MODALS (tidak diubah karena sudah clean) */}
      {showMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="collaborator-dialog-title" className="w-full max-w-md bg-surface rounded-panel shadow-e3 p-5 space-y-4">
            <header className="flex justify-between items-center">
              <div>
                <h3 id="collaborator-dialog-title" className="text-lg font-semibold">
                  {t("Anggota campaign", "Campaign members")}
                  <span className="ml-1.5 text-sm font-medium tabular-nums text-fg-subtle">
                    {members.length}
                  </span>
                </h3>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {t(
                    "Anggota yang ditambahkan ke campaign ini, bukan seluruh anggota workspace.",
                    "Members added to this campaign, not all workspace members.",
                  )}{" "}
                  {isSuperAdmin
                    ? t(
                        "Super Admin dapat menambahkan semua user.",
                        "Super admins can add any user.",
                      )
                    : t(
                        "Admin divisi asal akan menerima notifikasi untuk undangan lintas divisi.",
                        "Admins of the origin division will be notified about cross-division invitations.",
                      )}
                </p>
              </div>
              <button
                aria-label={t(
                  "Tutup dialog anggota campaign",
                  "Close campaign members dialog",
                )}
                onClick={() => setShowMembers(false)}
              >
                <X size={18} />
              </button>
            </header>

            <div className="custom-scrollbar max-h-52 space-y-1.5 overflow-y-auto">
              {members.length === 0 ? (
                <p className="rounded-control border border-dashed border-line px-3 py-5 text-center text-xs text-fg-subtle">
                  {t("Belum ada anggota campaign.", "No campaign members yet.")}
                </p>
              ) : (
                members.map((member) => (
                  <PersonRow
                    key={member.id}
                    person={member}
                    action={
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={loading}
                        aria-label={t(
                          "Hapus {name} dari campaign",
                          "Remove {name} from campaign",
                          { name: member.name },
                        )}
                        className="flex h-7 w-7 items-center justify-center rounded-[7px] text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                      >
                        <X size={13} aria-hidden="true" />
                      </button>
                    }
                  />
                ))
              )}
            </div>

            <MemberMentionInput
              collaboratorOnly
              workspaceId={workspaceId}
              placeholder={
                isSuperAdmin || isAdmin
                  ? t("Cari anggota campaign", "Search campaign members")
                  : undefined
              }
              onSelect={handleSelectUser}
            />

            {selectedUsers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-2.5 pr-1 text-2xs font-medium text-accent"
                  >
                    {user.name}
                    <button
                      type="button"
                      onClick={() => removeSelectedUser(user.id)}
                      aria-label={t("Batalkan {name}", "Remove {name}", {
                        name: user.name,
                      })}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-accent transition-colors hover:bg-accent/15"
                    >
                      <X size={11} aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMembers(false)}
                disabled={loading}
                className="h-8 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted disabled:opacity-50"
              >
                {t("Batal", "Cancel")}
              </button>

              <button
                type="button"
                onClick={handleAddMembers}
                disabled={loading || selectedUsers.length === 0}
                className="inline-flex h-8 items-center gap-1.5 rounded-control bg-accent px-3 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-50"
              >
                <Check size={13} aria-hidden="true" />
                {loading
                  ? t("Menyimpan…", "Saving…")
                  : `${t("Tambah", "Add")}${
                      selectedUsers.length ? ` ${selectedUsers.length}` : ""
                    }`}
              </button>
            </div>
          </section>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <section className="w-full max-w-sm bg-surface rounded-card shadow-e3 p-5 space-y-3">
            <h3 className="text-lg font-semibold">
              {t("Edit Campaign", "Edit campaign")}
            </h3>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-[7px] px-3 py-2 text-sm"
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-[7px] px-3 py-2 text-sm"
            />

            <DatePicker
              selected={dueDate}
              onChange={(date: Date | null) => setDueDate(date)}
              className="w-full border rounded-[7px] px-3 py-2 text-sm"
              isClearable
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEdit(false)}
                className="px-3 py-1 border rounded-[7px]"
              >
                {t("Batal", "Cancel")}
              </button>

              <button
                onClick={handleUpdateCampaign}
                className="px-3 py-1 bg-accent text-white rounded-[7px]"
              >
                {t("Simpan", "Save")}
              </button>
            </div>
          </section>
        </div>
      )}

      {showMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <section className="w-full max-w-md bg-surface rounded-card shadow-e3 p-5 space-y-4">
            <header className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {t("Pindah Workspace", "Move workspace")}
              </h3>
              <button
                aria-label={t(
                  "Tutup dialog pindah workspace",
                  "Close move workspace dialog",
                )}
                onClick={() => setShowMove(false)}
              >
                <X size={18} />
              </button>
            </header>

            <p className="text-sm text-fg-muted">
              {t("Campaign", "Campaign")}{" "}
              <span className="font-medium text-fg">{campaign.name}</span>{" "}
              {t(
                "beserta seluruh isinya (board, card, penugasan, dan member) akan dipindahkan. Workspace asal dan tujuan tidak dihapus.",
                "and everything in it (boards, cards, assignments, and members) will be moved. The source and target workspaces are not deleted.",
              )}
            </p>

            {loadingTargets ? (
              <p className="text-sm text-fg-subtle">
                {t("Memuat workspace tujuan...", "Loading target workspaces...")}
              </p>
            ) : moveTargets.length === 0 ? (
              <p className="text-sm text-fg-subtle">
                {t(
                  "Tidak ada workspace tujuan yang bisa Anda akses.",
                  "No target workspaces you can access.",
                )}
              </p>
            ) : (
              <div className="space-y-3">
                <select
                  value={moveTargetId}
                  onChange={(e) => {
                    setMoveTargetId(e.target.value);
                    setConfirmCrossDivision(false);
                  }}
                  className="w-full border rounded-[7px] px-3 py-2 text-sm"
                >
                  <option value="">
                    {t("Pilih workspace tujuan...", "Select a target workspace...")}
                  </option>
                  {moveTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                      {target.division_name ? ` — ${target.division_name}` : ""}
                      {target.is_cross_division
                        ? t(" (beda divisi)", " (different division)")
                        : ""}
                    </option>
                  ))}
                </select>

                {selectedMoveTarget?.is_cross_division && !isSuperAdmin && (
                  <label className="flex items-start gap-2 text-xs text-warning bg-warning-soft border border-warning/20 rounded-[7px] p-3">
                    <input
                      type="checkbox"
                      checked={confirmCrossDivision}
                      onChange={(e) => setConfirmCrossDivision(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      {t(
                        "Workspace tujuan berada di divisi berbeda. Saya paham member yang tidak berhak bisa kehilangan akses setelah dipindahkan.",
                        "The target workspace is in a different division. I understand members without access may lose access after the move.",
                      )}
                    </span>
                  </label>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowMove(false)}
                className="px-3 py-1 border rounded-[7px]"
              >
                {t("Batal", "Cancel")}
              </button>

              <button
                onClick={handleMoveCampaign}
                disabled={!moveTargetId || moving}
                className="px-3 py-1 bg-accent text-white rounded-[7px] disabled:opacity-50"
              >
                {moving
                  ? t("Memindahkan...", "Moving...")
                  : t("Pindahkan", "Move")}
              </button>
            </div>
          </section>
        </div>
      )}
    </article>
  );
}
