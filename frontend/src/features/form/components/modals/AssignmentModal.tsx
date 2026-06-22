import { useEffect, useMemo, useState } from "react";

import {
  Calendar,
  Clock3,
  Flag,
  FolderKanban,
  Loader2,
  Users,
  X,
  CheckCircle2,
} from "lucide-react";

import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

import useAssignSubmission from "../../hooks/useAssignSubmission";

import type { FormSubmission } from "../../types";

import type { AssignSubmissionPayload } from "../../api/form.api";

import { useCampaign } from "@/features/campaign/hooks/useCampaign";
import { useDivisions } from "@/features/division/hooks/useDivisions";
import { useWorkspaces } from "@/features/workspace/hooks/useWorkspaces";

import type { Campaign } from "@/features/campaign/types";
import type { Division } from "@/features/division/types";
import type { Workspace } from "@/features/workspace/types";

import DesignerPicker from "../DesignerPicker";

import { useAuth } from "../../../../context/AuthContext";

type Props = {
  open: boolean;
  submission: FormSubmission | null;
  onClose: () => void;
  onSuccess?: () => void;
};

const createInitialForm = (): AssignSubmissionPayload => ({
  campaign_id: "",

  workspace_id: "",

  division_id: "",

  designer_id: undefined,

  coordinator_id: undefined,

  deadline: undefined,

  estimated_hours: 1,

  priority: "medium",

  notes: "",
});

export default function AssignmentModal({
  open,
  submission,
  onClose,
  onSuccess,
}: Props) {
  const assignMutation = useAssignSubmission();

  const { user: authUser } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | MASTER DATA
  |--------------------------------------------------------------------------
  */

  const { data: divisions = [] } = useDivisions();

  /*
  |--------------------------------------------------------------------------
  | LOCAL STATE
  |--------------------------------------------------------------------------
  */

  const [selectedDivisionId, setSelectedDivisionId] = useState("");

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");

  const [selectedDesignerName, setSelectedDesignerName] = useState("");

  const [form, setForm] =
    useState<AssignSubmissionPayload>(createInitialForm());

  /*
  |--------------------------------------------------------------------------
  | WORKSPACES
  |--------------------------------------------------------------------------
  */

  const { data: workspaces = [] } = useWorkspaces(selectedDivisionId || "");

  /*
  |--------------------------------------------------------------------------
  | CAMPAIGNS
  |--------------------------------------------------------------------------
  */

  const campaignHook = useCampaign(selectedWorkspaceId || "");

  const campaigns = useMemo<Campaign[]>(() => {
    return Array.isArray(campaignHook?.campaigns) ? campaignHook.campaigns : [];
  }, [campaignHook]);

  /*
  |--------------------------------------------------------------------------
  | RESET FORM
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!open) return;

    setForm({
      ...createInitialForm(),

      coordinator_id: authUser?.id ?? "",
    });

    setSelectedDivisionId("");
    setSelectedWorkspaceId("");
    setSelectedDesignerName("");
  }, [open, authUser]);

  /*
  |--------------------------------------------------------------------------
  | AUTO FILL FROM SUBMISSION
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!open || !submission) {
      return;
    }

    const workspaceId = submission.form?.workspace_id || "";

    const divisionId = submission.form?.division_id || "";

    if (divisionId) {
      setSelectedDivisionId(divisionId);
    }

    if (workspaceId) {
      setSelectedWorkspaceId(workspaceId);
    }

    setForm((prev) => ({
      ...prev,

      division_id: divisionId,

      workspace_id: workspaceId,
    }));
  }, [open, submission]);

  /*
  |--------------------------------------------------------------------------
  | GUARD
  |--------------------------------------------------------------------------
  */

  if (!open || !submission) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | SUBMIT
  |--------------------------------------------------------------------------
  */

  const submit = () => {
    if (assignMutation.isPending) {
      return;
    }

    if (!authUser?.id) {
      alert("User tidak terautentikasi");
      return;
    }

    if (!form.division_id) {
      alert("Division wajib dipilih");
      return;
    }

    if (!form.workspace_id) {
      alert("Workspace wajib dipilih");
      return;
    }

    if (!form.campaign_id) {
      alert("Campaign wajib dipilih");
      return;
    }

    if (!form.designer_id) {
      alert("Designer wajib dipilih");
      return;
    }

const payload = {
  division_id: form.division_id,

  workspace_id: form.workspace_id,

  campaign_id: form.campaign_id,

  designer_id: form.designer_id,

  coordinator_id: authUser.id,

  deadline: form.deadline,

  estimated_hours: Number(form.estimated_hours) || 1,

  priority: form.priority || "medium",

  notes: form.notes?.trim() || "",
};

    assignMutation.mutate(
      {
        submissionId: submission.id,

        payload,
      },
      {
        onSuccess: () => {
          onSuccess?.();

          onClose();
        },

        onError: (error: unknown) => {
          console.error(error);

          alert(
            (
              error as {
                response?: {
                  data?: {
                    message?: string;
                  };
                };
              }
            )?.response?.data?.message || "Gagal membuat assignment",
          );
        },
      },
    );
  };

  const formatLocalDateTime = (
  date: Date
) => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const hours = String(
    date.getHours()
  ).padStart(2, "0");

  const minutes = String(
    date.getMinutes()
  ).padStart(2, "0");

  const seconds = String(
    date.getSeconds()
  ).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

  return (
    <div
      onClick={onClose}
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/60
        p-4
        backdrop-blur-sm
      "
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          relative
          max-h-[90vh]
          w-full
          max-w-4xl
          overflow-hidden
          rounded-3xl
          border border-zinc-200
          bg-white
          shadow-2xl
        "
      >
        {/* HEADER */}

        <div
          className="
            flex items-center justify-between
            border-b border-zinc-200
            px-6 py-5
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
            type="button"
            onClick={onClose}
            className="
              flex h-10 w-10
              items-center justify-center
              rounded-xl
              border border-zinc-200
              transition
              hover:bg-zinc-100
            "
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}

        <div
          className="
            max-h-[70vh]
            overflow-y-auto
            p-6
          "
        >
          {/* PREVIEW */}

          <div
            className="
              mb-6
              rounded-2xl
              border border-indigo-100
              bg-indigo-50
              p-5
            "
          >
            <div
              className="
                mb-2
                flex items-center gap-2
                text-sm font-medium
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
          </div>

          {/* GRID */}

          <div
            className="
              grid gap-5
              md:grid-cols-2
            "
          >
            {/* DIVISION */}

            <div>
              <label
                className="
                  mb-2
                  flex items-center gap-2
                  text-sm font-medium
                  text-zinc-700
                "
              >
                <Users size={16} />
                Division
              </label>

              <select
                value={selectedDivisionId}
                onChange={(e) => {
                  const value = e.target.value;

                  setSelectedDivisionId(value);

                  setSelectedWorkspaceId("");

                  setSelectedDesignerName("");

                  setForm((prev) => ({
                    ...prev,

                    division_id: value,

                    workspace_id: "",

                    campaign_id: "",

                    designer_id: undefined,
                  }));
                }}
                className="
                  w-full
                  rounded-2xl
                  border border-zinc-200
                  bg-white
                  px-4 py-3
                  outline-none
                  transition
                  focus:border-indigo-500
                  focus:ring-4
                  focus:ring-indigo-100
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

            {/* WORKSPACE */}

            <div>
              <label
                className="
                  mb-2
                  flex items-center gap-2
                  text-sm font-medium
                  text-zinc-700
                "
              >
                <FolderKanban size={16} />
                Workspace
              </label>

              <select
                value={selectedWorkspaceId}
                onChange={(e) => {
                  const value = e.target.value;

                  setSelectedWorkspaceId(value);

                  setSelectedDesignerName("");

                  setForm((prev) => ({
                    ...prev,

                    workspace_id: value,

                    campaign_id: "",

                    designer_id: undefined,
                  }));
                }}
                disabled={!selectedDivisionId}
                className="
                  w-full
                  rounded-2xl
                  border border-zinc-200
                  bg-white
                  px-4 py-3
                  outline-none
                  transition
                  focus:border-indigo-500
                  focus:ring-4
                  focus:ring-indigo-100
                  disabled:cursor-not-allowed
                  disabled:bg-zinc-100
                "
              >
                <option value="">Pilih Workspace</option>

                {workspaces.map((w: Workspace) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* CAMPAIGN */}

            <div>
              <label
                className="
                  mb-2
                  flex items-center gap-2
                  text-sm font-medium
                  text-zinc-700
                "
              >
                <FolderKanban size={16} />
                Campaign
              </label>

              <select
                value={form.campaign_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,

                    campaign_id: e.target.value,
                  }))
                }
                disabled={!selectedWorkspaceId}
                className="
                  w-full
                  rounded-2xl
                  border border-zinc-200
                  bg-white
                  px-4 py-3
                  outline-none
                  transition
                  focus:border-indigo-500
                  focus:ring-4
                  focus:ring-indigo-100
                  disabled:cursor-not-allowed
                  disabled:bg-zinc-100
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

            {/* DESIGNER */}

            <div className="md:col-span-2">
              <label
                className="
                  mb-2
                  flex items-center gap-2
                  text-sm font-medium
                  text-zinc-700
                "
              >
                <Users size={16} />
                Pilih User untuk Ditugaskan
              </label>

              <div
                className={
                  !selectedDivisionId ? "pointer-events-none opacity-60" : ""
                }
              >
                <DesignerPicker
                  divisionId={selectedDivisionId}
                  selected={
                    selectedDesignerName
                      ? {
                          id: form.designer_id || "",

                          name: selectedDesignerName,

                          email: "",
                        }
                      : null
                  }
                  onSelect={(user) => {
                    setSelectedDesignerName(user.name);

                    setForm((prev) => ({
                      ...prev,

                      designer_id: user.id,
                    }));
                  }}
                />
              </div>

              {selectedDesignerName && (
                <div
                  className="
                    mt-3
                    flex items-center gap-3
                    rounded-2xl
                    border border-emerald-200
                    bg-emerald-50
                    px-4 py-3
                  "
                >
                  <CheckCircle2 size={18} className="text-emerald-600" />

                  <div>
                    <p
                      className="
                        text-sm
                        font-semibold
                        text-emerald-700
                      "
                    >
                      Designer Dipilih
                    </p>

                    <p
                      className="
                        text-sm
                        text-zinc-700
                      "
                    >
                      {selectedDesignerName}
                    </p>
                  </div>
                </div>
              )}

              {!selectedDivisionId && (
                <p
                  className="
                    mt-2
                    text-xs
                    text-zinc-500
                  "
                >
                  Division wajib dipilih sebelum memilih designer
                </p>
              )}
            </div>

           {/* DEADLINE */}

<div>
  <label
    className="
      mb-2
      flex items-center gap-2
      text-sm font-medium
      text-zinc-700
    "
  >
    <Calendar size={16} />

    Deadline
  </label>

  <DatePicker
    selected={
      form.deadline
        ? new Date(form.deadline)
        : null
    }
    onChange={(
      date: Date | null
    ) => {
      setForm((prev) => ({
        ...prev,

        deadline: date
          ? formatLocalDateTime(date)
          : undefined,
      }));
    }}
    minDate={new Date()}
    showTimeSelect
    timeFormat="HH:mm"
    timeIntervals={15}
    dateFormat="dd MMM yyyy • HH:mm"
    placeholderText="Pilih deadline & jam"
    popperPlacement="bottom-start"
    showPopperArrow={false}
    isClearable
    calendarClassName="
      rounded-2xl
      border
      border-zinc-200
      shadow-2xl
    "
    className="
      w-full
      rounded-2xl
      border border-zinc-200
      bg-white
      px-4 py-3
      text-sm
      text-zinc-800
      shadow-sm
      outline-none
      transition-all
      duration-200

      hover:border-zinc-300

      focus:border-indigo-500
      focus:ring-4
      focus:ring-indigo-100
    "
  />

  <p
    className="
      mt-2
      text-xs
      text-zinc-500
    "
  >
    Tentukan batas waktu pengerjaan request
  </p>
</div>

            {/* ESTIMASI */}

            <div>
              <label
                className="
                  mb-2
                  flex items-center gap-2
                  text-sm font-medium
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
                  setForm((prev) => ({
                    ...prev,

                    estimated_hours: Number(e.target.value) || 1,
                  }))
                }
                className="
                  w-full
                  rounded-2xl
                  border border-zinc-200
                  px-4 py-3
                  outline-none
                  transition
                  focus:border-indigo-500
                  focus:ring-4
                  focus:ring-indigo-100
                "
              />
            </div>

            {/* PRIORITY */}

            <div className="md:col-span-2">
              <label
                className="
                  mb-2
                  flex items-center gap-2
                  text-sm font-medium
                  text-zinc-700
                "
              >
                <Flag size={16} />
                Priority
              </label>

              <div
                className="
                  grid grid-cols-2
                  gap-3
                  md:grid-cols-4
                "
              >
                {["low", "medium", "high", "urgent"].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,

                        priority: level as AssignSubmissionPayload["priority"],
                      }))
                    }
                    className={`
                      rounded-2xl
                      border
                      px-4 py-3
                      text-sm font-medium
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

          {/* NOTES */}

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
                setForm((prev) => ({
                  ...prev,

                  notes: e.target.value,
                }))
              }
              placeholder="Tambahkan brief atau instruksi tambahan..."
              className="
                min-h-[120px]
                w-full
                rounded-2xl
                border border-zinc-200
                px-4 py-3
                outline-none
                transition
                focus:border-indigo-500
                focus:ring-4
                focus:ring-indigo-100
              "
            />
          </div>
        </div>

        {/* FOOTER */}

        <div
          className="
            flex items-center justify-end
            gap-3
            border-t border-zinc-200
            px-6 py-5
          "
        >
          <button
            type="button"
            onClick={onClose}
            className="
              rounded-2xl
              border border-zinc-200
              px-5 py-3
              font-medium
              transition
              hover:bg-zinc-100
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={assignMutation.isPending}
            className="
              flex items-center gap-2
              rounded-2xl
              bg-indigo-600
              px-5 py-3
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
