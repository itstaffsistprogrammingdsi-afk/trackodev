import { useEffect, useState } from "react";

import useAssignSubmission from "../../hooks/useAssignSubmission";

import type {
  FormSubmission,
  AssignSubmissionPayload,
} from "../../types";

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
  const assignMutation =
    useAssignSubmission();

  const workspaceId =
    submission?.form?.workspace_id ?? "";

  const {
    campaigns = [],
  } = useCampaign(workspaceId);

  const {
    data: divisions = [],
  } = useDivisions();

  const {
    data: users = [],
  } = useUsers();

  const [
    form,
    setForm,
  ] =
    useState<AssignSubmissionPayload>(
      initialForm
    );

  useEffect(() => {
    if (!open) return;

    setForm(initialForm);
  }, [open]);

  if (
    !open ||
    !submission
  ) {
    return null;
  }

  const submit = () => {
    if (
      !form.campaign_id ||
      !form.division_id
    ) {
      alert(
        "Campaign dan Division wajib dipilih"
      );

      return;
    }

    assignMutation.mutate(
      {
        submissionId:
          submission.id,

        payload: form,
      },
      {
        onSuccess: () => {
          onSuccess?.();

          onClose();
        },
      }
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
      bg-black/50
      p-4
    "
    >
      <div
        onClick={(e) =>
          e.stopPropagation()
        }
        className="
        w-full
        max-w-3xl
        rounded-3xl
        bg-white
        p-6
      "
      >
        <h2
          className="
          mb-6
          text-xl
          font-bold
        "
        >
          Tugaskan Request
        </h2>

        <div
          className="
          grid
          gap-4
          md:grid-cols-2
        "
        >
          {/* Campaign */}

          <div>
            <label className="mb-2 block text-sm">
              Campaign
            </label>

            <select
              value={
                form.campaign_id
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  campaign_id:
                    e.target.value,
                })
              }
              className="
              w-full
              rounded-xl
              border
              p-3
            "
            >
              <option value="">
                Pilih Campaign
              </option>

              {campaigns.map(
                (
                  c: Campaign
                ) => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.name}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Division */}

          <div>
            <label className="mb-2 block text-sm">
              Division
            </label>

            <select
              value={
                form.division_id
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  division_id:
                    e.target.value,
                })
              }
              className="
              w-full
              rounded-xl
              border
              p-3
            "
            >
              <option value="">
                Pilih Division
              </option>

              {divisions.map(
                (
                  d: Division
                ) => (
                  <option
                    key={d.id}
                    value={d.id}
                  >
                    {d.name}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Designer */}

          <div>
            <label className="mb-2 block text-sm">
              Designer
            </label>

            <select
              value={
                form.designer_id ?? ""
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  designer_id:
                    e.target.value ||
                    undefined,
                })
              }
              className="
              w-full
              rounded-xl
              border
              p-3
            "
            >
              <option value="">
                Pilih Designer
              </option>

              {users.map(
                (
                  u: User
                ) => (
                  <option
                    key={u.id}
                    value={u.id}
                  >
                    {u.name}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Coordinator */}

          <div>
            <label className="mb-2 block text-sm">
              Coordinator
            </label>

            <select
              value={
                form.coordinator_id ??
                ""
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  coordinator_id:
                    e.target.value ||
                    undefined,
                })
              }
              className="
              w-full
              rounded-xl
              border
              p-3
            "
            >
              <option value="">
                Pilih Coordinator
              </option>

              {users.map(
                (
                  u: User
                ) => (
                  <option
                    key={u.id}
                    value={u.id}
                  >
                    {u.name}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Deadline */}

          <div>
            <label className="mb-2 block text-sm">
              Deadline
            </label>

            <input
              type="date"
              value={
                form.deadline ?? ""
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  deadline:
                    e.target.value ||
                    undefined,
                })
              }
              className="
              w-full
              rounded-xl
              border
              p-3
            "
            />
          </div>

          {/* Estimasi */}

          <div>
            <label className="mb-2 block text-sm">
              Estimasi Jam
            </label>

            <input
              type="number"
              min={1}
              value={
                form.estimated_hours
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  estimated_hours:
                    Number(
                      e.target.value
                    ),
                })
              }
              className="
              w-full
              rounded-xl
              border
              p-3
            "
            />
          </div>

          {/* Priority */}

          <div>
            <label className="mb-2 block text-sm">
              Priority
            </label>

            <select
              value={
                form.priority
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  priority:
                    e.target
                      .value as AssignSubmissionPayload["priority"],
                })
              }
              className="
              w-full
              rounded-xl
              border
              p-3
            "
            >
              <option value="low">
                Low
              </option>

              <option value="medium">
                Medium
              </option>

              <option value="high">
                High
              </option>

              <option value="urgent">
                Urgent
              </option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm">
            Catatan
          </label>

          <textarea
            value={form.notes}
            onChange={(e) =>
              setForm({
                ...form,
                notes:
                  e.target.value,
              })
            }
            className="
            min-h-24
            w-full
            rounded-xl
            border
            p-3
          "
          />
        </div>

        <div
          className="
          mt-6
          flex
          justify-end
          gap-3
        "
        >
          <button
            onClick={onClose}
            className="
            rounded-xl
            border
            px-4
            py-2
          "
          >
            Cancel
          </button>

          <button
            onClick={submit}
            disabled={
              assignMutation.isPending
            }
            className="
            rounded-xl
            bg-indigo-600
            px-4
            py-2
            text-white
            disabled:opacity-50
          "
          >
            {assignMutation.isPending
              ? "Menyimpan..."
              : "Tugaskan"}
          </button>
        </div>
      </div>
    </div>
  );
}