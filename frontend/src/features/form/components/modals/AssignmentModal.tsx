import { useEffect, useMemo, useState } from "react";

import {
  Calendar,
  Clock3,
  Flag,
  FolderKanban,
  Loader2,
  Users,
  X,
} from "lucide-react";

import useAssignSubmission from "../../hooks/useAssignSubmission";
<<<<<<< HEAD

import type { FormSubmission, AssignSubmissionPayload } from "../../types";
=======
import type { FormSubmission } from "../../types";
import { AssignSubmissionPayload } from "../../api/form.api";
>>>>>>> 4277e65 (pc)

import { useCampaign } from "@/features/campaign/hooks/useCampaign";
import { useUsers } from "@/features/user/hooks/useUsers";

import type { Campaign } from "@/features/campaign/types";
import type { User } from "@/features/user/types";

type Props = {
  open: boolean;
  submission: FormSubmission | null;
  onClose: () => void;
  onSuccess?: () => void;
};

const initialForm: AssignSubmissionPayload = {
  campaign_id: "",
designer_id: undefined,
coordinator_id: undefined,
deadline: undefined,
  estimated_hours: 1,
  priority: "medium",
  notes: "",
};

export default function AssignmentModal({
  open,
  submission,
  onClose,
  onSuccess,
}: Props) {
  const assignMutation = useAssignSubmission();

<<<<<<< HEAD
  const workspaceId = submission?.form?.workspace_id ?? "";

  const { campaigns = [] } = useCampaign(workspaceId);

  const { data: divisions = [] } = useDivisions();

  const { data: users = [] } = useUsers();

  const [form, setForm] = useState<AssignSubmissionPayload>(initialForm);

  /*
  |--------------------------------------------------------------------------
  | Reset form
  |--------------------------------------------------------------------------
  */
=======
  const workspaceId = submission?.form?.workspace_id ?? null;

  const { campaigns = [] } = useCampaign(workspaceId ?? "");
  const { data: users = [] } = useUsers();

  const [form, setForm] =
    useState<AssignSubmissionPayload>(initialForm);
>>>>>>> 4277e65 (pc)

  /**
   * RESET FORM setiap modal dibuka atau submission berubah
   */
  useEffect(() => {
    if (!open) return;

    setForm({
      ...initialForm,
      campaign_id: "",
    });
  }, [open, submission?.id]);

<<<<<<< HEAD
  /*
  |--------------------------------------------------------------------------
  | Auto select division dari campaign
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!form.campaign_id) return;

    const selectedCampaign = campaigns.find(
      (c: Campaign) => c.id === form.campaign_id,
    );

    if (selectedCampaign?.division_id) {
      setForm((prev) => ({
        ...prev,
        division_id: selectedCampaign.division_id,
      }));
    }
  }, [form.campaign_id, campaigns]);

  /*
  |--------------------------------------------------------------------------
  | Filter user berdasarkan division
  |--------------------------------------------------------------------------
  */

  const filteredUsers = useMemo(() => {
    return users;
  }, [users]);

  if (!open || !submission) {
    return null;
  }
=======
  if (!open || !submission) return null;

  const isDisabled =
    assignMutation.isPending || !workspaceId || !form.campaign_id;
>>>>>>> 4277e65 (pc)

  /*
  |--------------------------------------------------------------------------
  | Submit
  |--------------------------------------------------------------------------
  */

  const submit = () => {
<<<<<<< HEAD
    if (!form.campaign_id || !form.division_id) {
      alert("Campaign dan Division wajib dipilih");

=======
    if (!form.campaign_id) {
      alert("Campaign wajib dipilih");
>>>>>>> 4277e65 (pc)
      return;
    }

    assignMutation.mutate(
      {
        submissionId: submission.id,
<<<<<<< HEAD

        payload: form,
=======
        payload: {
          ...form,
          designer_id: form.designer_id || undefined,
          coordinator_id: form.coordinator_id || undefined,
          deadline: form.deadline || undefined,
        },
>>>>>>> 4277e65 (pc)
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        },
      },
    );
  };

  return (
    <div
      onClick={onClose}
<<<<<<< HEAD
      className="
      fixed
      inset-0
      z-50
      flex
      items-center
      justify-center
      bg-black/60
      p-4
      backdrop-blur-sm
    "
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
        relative
        w-full
        max-w-4xl
        overflow-hidden
        rounded-3xl
        border
        border-zinc-200
        bg-white
        shadow-2xl
      "
      >
        {/* Header */}

        <div
          className="
          flex
          items-center
          justify-between
          border-b
          border-zinc-200
          px-6
          py-5
        "
        >
          <div>
            <h2
              className="
              text-2xl
              font-bold
              text-zinc-900
            "
            >
              Tugaskan Request
            </h2>

            <p
              className="
              mt-1
              text-sm
              text-zinc-500
            "
            >
              Request akan otomatis masuk ke board By Request
            </p>
          </div>

          <button
            onClick={onClose}
            className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            border
            border-zinc-200
            transition
            hover:bg-zinc-100
          "
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}

        <div className="p-6">
          {/* Submission Preview */}

          <div
            className="
            mb-6
            rounded-2xl
            border
            border-indigo-100
            bg-indigo-50
            p-5
          "
          >
            <div
              className="
              mb-2
              flex
              items-center
              gap-2
              text-sm
              font-medium
              text-indigo-700
            "
            >
              <FolderKanban size={16} />
              Incoming Request
            </div>

            <h3
              className="
              text-lg
              font-semibold
              text-zinc-900
            "
            >
              {submission.form?.name ?? "Untitled Request"}
            </h3>

            <p
              className="
              mt-2
              line-clamp-3
              text-sm
              text-zinc-600
            "
            ></p>
          </div>

          {/* Form Grid */}

          <div
            className="
            grid
            gap-5
            md:grid-cols-2
          "
          >
            {/* Campaign */}

            <div>
              <label
                className="
                mb-2
                flex
                items-center
                gap-2
                text-sm
                font-medium
                text-zinc-700
              "
              >
                <FolderKanban size={16} />
                Campaign
              </label>

              <select
                value={form.campaign_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    campaign_id: e.target.value,
                  })
                }
                className="
                w-full
                rounded-2xl
                border
                border-zinc-200
                bg-white
                px-4
                py-3
                outline-none
                transition
                focus:border-indigo-500
                focus:ring-4
                focus:ring-indigo-100
              "
              >
                <option value="">
                  {campaigns.length === 0
                    ? "Tidak ada campaign"
                    : "Pilih Campaign"}
                </option>

                {campaigns.map((c: Campaign) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Division */}

            <div>
              <label
                className="
                mb-2
                flex
                items-center
                gap-2
                text-sm
                font-medium
                text-zinc-700
              "
              >
                <Users size={16} />
                Division
              </label>

              <select
                value={form.division_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    division_id: e.target.value,
                  })
                }
                className="
                w-full
                rounded-2xl
                border
                border-zinc-200
                bg-zinc-50
                px-4
                py-3
                outline-none
              "
              >
                <option value="">Pilih Division</option>

                {divisions.map((d: Division) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Designer */}

            <div>
              <label
                className="
                mb-2
                block
                text-sm
                font-medium
                text-zinc-700
              "
              >
                Designer
              </label>

              <select
                value={form.designer_id ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    designer_id: e.target.value || undefined,
                  })
                }
                className="
                w-full
                rounded-2xl
                border
                border-zinc-200
                px-4
                py-3
                outline-none
                transition
                focus:border-indigo-500
                focus:ring-4
                focus:ring-indigo-100
              "
              >
                <option value="">Pilih Designer</option>

                {filteredUsers.map((u: User) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Coordinator */}

            <div>
              <label
                className="
                mb-2
                block
                text-sm
                font-medium
                text-zinc-700
              "
              >
                Coordinator
              </label>

              <select
                value={form.coordinator_id ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    coordinator_id: e.target.value || undefined,
                  })
                }
                className="
                w-full
                rounded-2xl
                border
                border-zinc-200
                px-4
                py-3
                outline-none
                transition
                focus:border-indigo-500
                focus:ring-4
                focus:ring-indigo-100
              "
              >
                <option value="">Pilih Coordinator</option>

                {filteredUsers.map((u: User) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Deadline */}

            <div>
              <label
                className="
                mb-2
                flex
                items-center
                gap-2
                text-sm
                font-medium
                text-zinc-700
              "
              >
                <Calendar size={16} />
                Deadline
              </label>

              <input
                type="date"
                value={form.deadline ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    deadline: e.target.value || undefined,
                  })
                }
                className="
                w-full
                rounded-2xl
                border
                border-zinc-200
                px-4
                py-3
                outline-none
                transition
                focus:border-indigo-500
                focus:ring-4
                focus:ring-indigo-100
              "
              />
            </div>

            {/* Estimasi */}

            <div>
              <label
                className="
                mb-2
                flex
                items-center
                gap-2
                text-sm
                font-medium
                text-zinc-700
              "
              >
                <Clock3 size={16} />
                Estimasi Jam
              </label>

              <input
                type="number"
                min={1}
                value={form.estimated_hours}
                onChange={(e) =>
                  setForm({
                    ...form,
                    estimated_hours: Number(e.target.value),
                  })
                }
                className="
                w-full
                rounded-2xl
                border
                border-zinc-200
                px-4
                py-3
                outline-none
                transition
                focus:border-indigo-500
                focus:ring-4
                focus:ring-indigo-100
              "
              />
            </div>

            {/* Priority */}

            <div className="md:col-span-2">
              <label
                className="
                mb-2
                flex
                items-center
                gap-2
                text-sm
                font-medium
                text-zinc-700
              "
              >
                <Flag size={16} />
                Priority
              </label>

              <div
                className="
                grid
                grid-cols-2
                gap-3
                md:grid-cols-4
              "
              >
                {["low", "medium", "high", "urgent"].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        priority: level as AssignSubmissionPayload["priority"],
                      })
                    }
                    className={`
                      rounded-2xl
                      border
                      px-4
                      py-3
                      text-sm
                      font-medium
                      capitalize
                      transition
                      ${
                        form.priority === level
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-zinc-200 bg-white hover:bg-zinc-100"
                      }
                    `}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}

          <div className="mt-5">
            <label
              className="
              mb-2
              block
              text-sm
              font-medium
              text-zinc-700
            "
            >
              Catatan Assignment
            </label>

            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm({
                  ...form,
                  notes: e.target.value,
                })
              }
              placeholder="
              Tambahkan brief atau instruksi tambahan...
            "
              className="
              min-h-[120px]
              w-full
              rounded-2xl
              border
              border-zinc-200
              px-4
              py-3
              outline-none
              transition
              focus:border-indigo-500
              focus:ring-4
              focus:ring-indigo-100
            "
            />
          </div>
        </div>

        {/* Footer */}

        <div
          className="
          flex
          items-center
          justify-end
          gap-3
          border-t
          border-zinc-200
          px-6
          py-5
        "
        >
          <button
            onClick={onClose}
            className="
            rounded-2xl
            border
            border-zinc-200
            px-5
            py-3
            font-medium
            transition
            hover:bg-zinc-100
          "
          >
=======
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-3xl bg-white p-6"
      >
        <h2 className="mb-6 text-xl font-bold">
          Tugaskan Request
        </h2>

        {!workspaceId && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            Workspace tidak ditemukan dari form submission.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* Campaign */}
          <div>
            <label className="mb-2 block text-sm">Campaign</label>
            <select
              value={form.campaign_id}
              onChange={(e) =>
                setForm({ ...form, campaign_id: e.target.value })
              }
              disabled={!workspaceId}
              className="w-full rounded-xl border p-3 disabled:bg-gray-100"
            >
              <option value="">Pilih Campaign</option>

              {campaigns.length === 0 ? (
                <option disabled>Tidak ada campaign</option>
              ) : (
                campaigns.map((c: Campaign) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Designer */}
          <div>
            <label className="mb-2 block text-sm">Designer</label>
            <select
              value={form.designer_id ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  designer_id: e.target.value || undefined,
                })
              }
              className="w-full rounded-xl border p-3"
            >
              <option value="">Pilih Designer</option>
              {users.map((u: User) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Coordinator */}
          <div>
            <label className="mb-2 block text-sm">Coordinator</label>
            <select
              value={form.coordinator_id ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  coordinator_id: e.target.value || undefined,
                })
              }
              className="w-full rounded-xl border p-3"
            >
              <option value="">Pilih Coordinator</option>
              {users.map((u: User) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Deadline */}
          <div>
            <label className="mb-2 block text-sm">Deadline</label>
            <input
              type="date"
              value={form.deadline ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  deadline: e.target.value || undefined,
                })
              }
              className="w-full rounded-xl border p-3"
            />
          </div>

          {/* Estimasi */}
          <div>
            <label className="mb-2 block text-sm">Estimasi Jam</label>
            <input
              type="number"
              min={1}
              value={form.estimated_hours}
              onChange={(e) =>
                setForm({
                  ...form,
                  estimated_hours: Number(e.target.value),
                })
              }
              className="w-full rounded-xl border p-3"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="mb-2 block text-sm">Priority</label>
            <select
              value={form.priority}
              onChange={(e) =>
                setForm({
                  ...form,
                  priority:
                    e.target.value as AssignSubmissionPayload["priority"],
                })
              }
              className="w-full rounded-xl border p-3"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label className="mb-2 block text-sm">Catatan</label>
          <textarea
            value={form.notes}
            onChange={(e) =>
              setForm({ ...form, notes: e.target.value })
            }
            className="min-h-24 w-full rounded-xl border p-3"
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border px-4 py-2">
>>>>>>> 4277e65 (pc)
            Cancel
          </button>

          <button
            onClick={submit}
<<<<<<< HEAD
            disabled={assignMutation.isPending}
            className="
            flex
            items-center
            gap-2
            rounded-2xl
            bg-indigo-600
            px-5
            py-3
            font-medium
            text-white
            transition
            hover:bg-indigo-700
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
          >
            {assignMutation.isPending && (
              <Loader2 size={18} className="animate-spin" />
            )}

            {assignMutation.isPending ? "Menyimpan..." : "Tugaskan Request"}
=======
            disabled={isDisabled}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {assignMutation.isPending ? "Menyimpan..." : "Tugaskan"}
>>>>>>> 4277e65 (pc)
          </button>
        </div>
      </div>
    </div>
  );
}
