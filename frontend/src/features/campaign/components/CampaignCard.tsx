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
    if (!(await confirmDialog({ message: "Yakin ingin menghapus campaign ini?", variant: "danger" }))) return;

    try {
      setLoading(true);

      await deleteCampaign(campaign.id);

      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });

      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal menghapus campaign"));
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
      toast.error(getErrorMessage(err, "Gagal update campaign"));
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
    () => moveTargets.find((t) => t.id === moveTargetId) ?? null,
    [moveTargets, moveTargetId],
  );

  const handleMoveCampaign = async () => {
    if (!moveTargetId) return;

    if (
      selectedMoveTarget?.is_cross_division &&
      !confirmCrossDivision &&
      !isSuperAdmin
    ) {
      toast.info("Centang konfirmasi untuk memindahkan campaign lintas divisi.");
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
        `Campaign "${campaign.name}" berhasil dipindahkan ke workspace "${res.summary.target_workspace_name}".`,
      );

      // Navigate hanya bila aktor memang masih punya akses ke workspace tujuan.
      // Jika tidak, tetap di halaman ini agar tidak menabrak halaman 403.
      if (res.summary.can_access_target !== false) {
        navigate(`/workspaces/${moveTargetId}/campaigns`);
      } else {
        toast.info(
          "Anda tidak memiliki akses ke workspace tujuan. Minta admin workspace tersebut untuk memberi akses bila perlu memantau campaign ini.",
        );
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal memindahkan campaign"));
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
          failed.push(`${user.name}: ${getErrorMessage(err, "gagal")}`);
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
        toast.success(`${successCount} member berhasil ditambahkan.`);
      } else if (successCount === 0) {
        toast.error(`Gagal menambahkan member. ${failed.join("; ")}`);
      } else {
        toast.info(
          `${successCount} berhasil, ${failed.length} gagal — ${failed.join("; ")}`,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!(await confirmDialog({ message: "Yakin hapus member?", variant: "danger" }))) return;

    try {
      setLoading(true);

      await removeMember(campaign.id, id);

      await queryClient.invalidateQueries({
        queryKey: ["campaign-members", campaign.id],
      });
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal hapus member"));
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  return (
    <article className="p-4 rounded-2xl border bg-white dark:bg-gray-900 hover:shadow-lg transition flex flex-col gap-3">
      {/* HEADER */}
      <header className="space-y-1">
        <Link to={`/workspaces/${workspaceId}/campaigns/${campaign.id}/boards`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {name}
          </h3>
        </Link>

        <p className="text-sm text-gray-500 line-clamp-2">
          {description || "No description"}
        </p>
      </header>

      {/* META */}
      <section className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400">{members.length} members</span>

        {dueStatus && (
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              dueStatus.isExpired
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-600"
            }`}
          >
            Due {dueStatus.date}
          </span>
        )}
      </section>

      {/* ACTIONS */}
<footer className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
    {campaign.type}
  </span>

  {/* DETAIL */}
  {/* <Link
    to={`/workspaces/${workspaceId}/campaigns/${campaign.id}`}
    className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600"
    title="Detail Campaign"
  >
    <Eye size={16} />
  </Link> */}

  {/* MEMBERS */}
  <button
    onClick={() => setShowMembers(true)}
    className="p-2 rounded-lg hover:bg-blue-50"
    title="Manage Members"
  >
    <Users size={16} />
  </button>

  {/* EDIT */}
  <button
    onClick={() => setShowEdit(true)}
    className="p-2 rounded-lg hover:bg-yellow-50"
    title="Edit Campaign"
  >
    <Pencil size={16} />
  </button>

  {/* MOVE WORKSPACE */}
  <button
    onClick={() => setShowMove(true)}
    className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600"
    title="Pindah Workspace"
  >
    <ArrowRightLeft size={16} />
  </button>

  {/* DELETE */}
  <button
    onClick={handleDeleteCampaign}
    disabled={loading}
    className="p-2 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-50"
    title="Delete Campaign"
  >
    <Trash2 size={16} />
  </button>

  <Link
  to={`/workspaces/${workspaceId}/campaigns/${campaign.id}`}
  className="ml-auto text-sm font-small text-gray-500 hover:text-gray-700"
>
  View Details →
</Link>

{/* <Link to={`/workspaces/${workspaceId}/campaigns/${campaign.id}/boards`}>
  View Boards →
</Link> */}
</footer>

      {/* MODALS (tidak diubah karena sudah clean) */}
      {showMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="collaborator-dialog-title" className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 space-y-4">
            <header className="flex justify-between items-center">
              <div>
                <h3 id="collaborator-dialog-title" className="text-lg font-semibold">Kelola Collaborator</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {isSuperAdmin
                    ? "Super Admin dapat menambahkan semua user."
                    : "Tambahkan anggota dari division mana pun. Admin division asal akan menerima notifikasi untuk undangan lintas division."}
                </p>
              </div>
              <button aria-label="Tutup dialog collaborator" onClick={() => setShowMembers(false)}>
                <X size={18} />
              </button>
            </header>

            <div className="max-h-52 overflow-y-auto space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg"
                >
                  {m.name}
                  <button onClick={() => handleRemoveMember(m.id)}>
                    <X size={14} className="text-red-500" />
                  </button>
                </div>
              ))}
            </div>

            <MemberMentionInput
              collaboratorOnly
              workspaceId={workspaceId}
              placeholder={isSuperAdmin || isAdmin ? "Cari user atau email..." : undefined}
              onSelect={handleSelectUser}
            />

            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs"
                >
                  {u.name}
                  <button onClick={() => removeSelectedUser(u.id)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowMembers(false)}
                className="px-3 py-1 border rounded-lg"
              >
                Close
              </button>

              <button
                onClick={handleAddMembers}
                className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-lg"
              >
                <Check size={14} /> Add
              </button>
            </div>
          </section>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <section className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 space-y-3">
            <h3 className="text-lg font-semibold">Edit Campaign</h3>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />

            <DatePicker
              selected={dueDate}
              onChange={(date: Date | null) => setDueDate(date)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              isClearable
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEdit(false)}
                className="px-3 py-1 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleUpdateCampaign}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </section>
        </div>
      )}

      {showMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <section className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 space-y-4">
            <header className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Pindah Workspace</h3>
              <button
                aria-label="Tutup dialog pindah workspace"
                onClick={() => setShowMove(false)}
              >
                <X size={18} />
              </button>
            </header>

            <p className="text-sm text-gray-500">
              Campaign <span className="font-medium text-gray-800">{campaign.name}</span>{" "}
              beserta seluruh isinya (board, card, penugasan, dan member) akan
              dipindahkan. Workspace asal dan tujuan tidak dihapus.
            </p>

            {loadingTargets ? (
              <p className="text-sm text-gray-400">Memuat workspace tujuan...</p>
            ) : moveTargets.length === 0 ? (
              <p className="text-sm text-gray-400">
                Tidak ada workspace tujuan yang bisa Anda akses.
              </p>
            ) : (
              <div className="space-y-3">
                <select
                  value={moveTargetId}
                  onChange={(e) => {
                    setMoveTargetId(e.target.value);
                    setConfirmCrossDivision(false);
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Pilih workspace tujuan...</option>
                  {moveTargets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.division_name ? ` — ${t.division_name}` : ""}
                      {t.is_cross_division ? " (beda divisi)" : ""}
                    </option>
                  ))}
                </select>

                {selectedMoveTarget?.is_cross_division && !isSuperAdmin && (
                  <label className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <input
                      type="checkbox"
                      checked={confirmCrossDivision}
                      onChange={(e) => setConfirmCrossDivision(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Workspace tujuan berada di divisi berbeda. Saya paham
                      member yang tidak berhak bisa kehilangan akses setelah
                      dipindahkan.
                    </span>
                  </label>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowMove(false)}
                className="px-3 py-1 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleMoveCampaign}
                disabled={!moveTargetId || moving}
                className="px-3 py-1 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
              >
                {moving ? "Memindahkan..." : "Pindahkan"}
              </button>
            </div>
          </section>
        </div>
      )}
    </article>
  );
}
