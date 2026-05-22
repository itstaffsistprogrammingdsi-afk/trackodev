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

import type { FormSubmission, AssignSubmissionPayload } from "../../types";

import { useCampaign } from "@/features/campaign/hooks/useCampaign";
import { useDivisions } from "@/features/division/hooks/useDivisions";
import { useUsers } from "@/features/user/hooks/useUsers";

import type { Campaign } from "@/features/campaign/types";
import type { Division } from "@/features/division/types";
import type { User } from "@/features/user/types";

type Props = {
  open: boolean;
  submission: FormSubmission | null;
  onClose: () => void;
  onSuccess?: () => void;
};

const initialForm: AssignSubmissionPayload = {
  campaign_id: "",
  division_id: "",
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

  useEffect(() => {
    if (!open) return;

    setForm(initialForm);
  }, [open]);

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

  /*
  |--------------------------------------------------------------------------
  | Submit
  |--------------------------------------------------------------------------
  */

  const submit = () => {
    if (!form.campaign_id || !form.division_id) {
      alert("Campaign dan Division wajib dipilih");

      return;
    }

    assignMutation.mutate(
      {
        submissionId: submission.id,

        payload: form,
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
            Cancel
          </button>

          <button
            onClick={submit}
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
          </button>
        </div>
      </div>
    </div>
  );
}
