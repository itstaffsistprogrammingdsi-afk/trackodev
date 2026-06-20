import { Campaign, Member,  } from "../types";
import { Link, useParams } from "react-router-dom";
import { useState, useMemo } from "react";
import api from "../../../lib/axios";
import { AxiosError } from "axios";
import MemberMentionInput from "./MemberMentionInput";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Pencil, Trash2, X, Check, } from "lucide-react";

export default function CampaignCard({
  campaign,
  onChanged,
}: {
  campaign: Campaign;
  onChanged?: () => void;
}) {  const { workspaceId } = useParams<{
    workspaceId: string;
  }>();
  const queryClient = useQueryClient();

  const [showMembers, setShowMembers] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

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
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/campaigns/${campaign.id}`);
      return res.data.data.members;
    },
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
    if (!confirm("Yakin ingin menghapus campaign ini?")) return;

    try {
      setLoading(true);

      await api.delete(`/workspaces/${workspaceId}/campaigns/${campaign.id}`);

      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });

      onChanged?.();
    } catch (err) {
      alert(getErrorMessage(err, "Gagal menghapus campaign"));
    } finally {
      setLoading(false);
    }
  };

  // ================= UPDATE =================
  const handleUpdateCampaign = async () => {
    try {
      setLoading(true);

      await api.put(`/workspaces/${workspaceId}/campaigns/${campaign.id}`, {
        name,
        description,
        due_date: dueDate ? dueDate.toISOString().split("T")[0] : null,
      });

      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });

      onChanged?.();
      setShowEdit(false);
    } catch (err) {
      alert(getErrorMessage(err, "Gagal update campaign"));
    } finally {
      setLoading(false);
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

      await Promise.all(
        selectedUsers.map((user) =>
          api.post(`/workspaces/${workspaceId}/campaigns/${campaign.id}/members`, {
            user_id: user.id,
          }),
        ),
      );

      setSelectedUsers([]);
      setShowMembers(false);

      await queryClient.invalidateQueries({
        queryKey: ["campaign-members", campaign.id],
      });
    } catch (err) {
      alert(getErrorMessage(err, "Gagal tambah member"));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm("Yakin hapus member?")) return;

    try {
      setLoading(true);

      await api.delete(`/workspaces/${workspaceId}/campaigns/${campaign.id}/members/${id}`);

      await queryClient.invalidateQueries({
        queryKey: ["campaign-members", campaign.id],
      });
    } catch (err) {
      alert(getErrorMessage(err, "Gagal hapus member"));
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
          <section className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 space-y-4">
            <header className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Manage Members</h3>
              <button onClick={() => setShowMembers(false)}>
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

            <MemberMentionInput onSelect={handleSelectUser} />

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
    </article>
  );
}
