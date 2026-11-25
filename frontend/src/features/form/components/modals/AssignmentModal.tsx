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

import type { Form, FormSubmission } from "../../types";

import type { AssignSubmissionPayload } from "../../api/form.api";

import { useCampaign } from "@/features/campaign/hooks/useCampaign";
import { useDivisions } from "@/features/division/hooks/useDivisions";
import { useWorkspaces } from "@/features/workspace/hooks/useWorkspaces";

import { toast } from "@/lib/feedback";

import type { Campaign } from "@/features/campaign/types";
import type { Division } from "@/features/division/types";
import type { Workspace } from "@/features/workspace/types";

import DesignerPicker from "../DesignerPicker";
import RenderCellValue from "../cells/RenderCellValue";

import { useAuth } from "../../../../context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  open: boolean;
  submission: FormSubmission | null;
  requestForm: Form;
  onClose: () => void;
  onSuccess?: () => void;
};

const PRIORITY_OPTIONS: Array<{
  value: NonNullable<AssignSubmissionPayload["priority"]>;
  label: string;
  labelEn: string;
}> = [
  { value: "low", label: "Rendah", labelEn: "Low" },
  { value: "medium", label: "Normal", labelEn: "Medium" },
  { value: "high", label: "Tinggi", labelEn: "High" },
  { value: "urgent", label: "Urgent", labelEn: "Urgent" },
];

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
  requestForm,
  onClose,
  onSuccess,
}: Props) {
  const { t } = useLanguage();
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

  const answeredFields = (requestForm.fields ?? []).filter((field) => {
    const value = submission.data?.[field.name];
    return value !== undefined && value !== null && value !== "";
  });

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
      toast.error(t("User tidak terautentikasi", "User is not authenticated"));
      return;
    }

    if (!form.division_id) {
      toast.error(t("Division wajib dipilih", "Division is required"));
      return;
    }

    if (!form.workspace_id) {
      toast.error(t("Workspace wajib dipilih", "Workspace is required"));
      return;
    }

    if (!form.campaign_id) {
      toast.error(t("Campaign wajib dipilih", "Campaign is required"));
      return;
    }

    if (!form.designer_id) {
      toast.error(t("PIC/anggota wajib dipilih", "PIC/member is required"));
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

          toast.error(
            (
              error as {
                response?: {
                  data?: {
                    message?: string;
                  };
                };
              }
            )?.response?.data?.message || t("Gagal membuat assignment", "Failed to create assignment"),
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="
          relative
          max-h-[90vh]
          w-full
          max-w-4xl
          overflow-hidden
          rounded-modal
          border border-line
          bg-surface
          shadow-2xl
        "
      >
        {/* HEADER */}

        <div
          className="
            flex items-center justify-between
            border-b border-line
            px-6 py-5
          "
        >
          <div>
            <h2
              id="assignment-modal-title"
              className="
                text-2xl
                font-bold
                text-zinc-900
              "
            >
              {t("Tugaskan request", "Assign request")}
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-zinc-500
              "
            >
              {t(
                "Request akan otomatis masuk ke board By Request",
                "The request will automatically be added to the By Request board",
              )}
            </p>
          </div>

          <button
            type="button"
            aria-label={t("Tutup modal assignment", "Close assignment modal")}
            onClick={onClose}
            className="
              flex h-10 w-10
              items-center justify-center
              rounded-control
              border border-line
              transition
              hover:bg-surface-muted
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
              rounded-card
              border border-accent/15
              bg-accent-soft
              p-5
            "
          >
            <div
              className="
                mb-2
                flex items-center gap-2
                text-sm font-medium
                text-accent
              "
            >
              <FolderKanban size={16} />
              {t("Request masuk", "Incoming request")}
            </div>

            <h3
              className="
                text-lg
                font-semibold
                text-zinc-900
              "
            >
              {submission.form?.name ?? t("Request tanpa judul", "Untitled request")}
            </h3>

            {answeredFields.length > 0 ? (
              <div className="mt-4 border-t border-accent/15 pt-4">
                <p className="mb-3 text-2xs font-medium text-accent">
                  {t("Detail request", "Request details")}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {answeredFields.map((field) => (
                    <div key={field.id} className="min-w-0 rounded-control border border-accent/15 bg-surface p-3">
                      <p className="mb-2 text-xs font-medium text-fg-muted">{field.label}</p>
                      <RenderCellValue
                        value={submission.data?.[field.name]}
                        label={field.label}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
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
                {t("Divisi", "Division")}
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
                  rounded-card
                  border border-line
                  bg-surface
                  px-4 py-3
                  outline-none
                  transition
                  focus:border-indigo-500
                  focus:ring-4
                  focus:ring-indigo-100
                "
              >
                <option value="">{t("Pilih divisi", "Select division")}</option>

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
                {t("Workspace", "Workspace")}
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
                  rounded-card
                  border border-line
                  bg-surface
                  px-4 py-3
                  outline-none
                  transition
                  focus:border-indigo-500
                  focus:ring-4
                  focus:ring-indigo-100
                  disabled:cursor-not-allowed
                  disabled:bg-surface-muted
                "
              >
                <option value="">{t("Pilih workspace", "Select workspace")}</option>

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
                {t("Campaign", "Campaign")}
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
                  rounded-card
                  border border-line
                  bg-surface
                  px-4 py-3
                  outline-none
                  transition
                  focus:border-indigo-500
                  focus:ring-4
                  focus:ring-indigo-100
                  disabled:cursor-not-allowed
                  disabled:bg-surface-muted
                "
              >
                <option value="">
                  {campaigns.length === 0
                    ? t("Tidak ada campaign", "No campaigns")
                    : t("Pilih campaign", "Select campaign")}
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
                {t("Pilih pengguna untuk ditugaskan", "Select a user to assign")}
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
                    rounded-card
                    border border-emerald-200
                    bg-success-soft
                    px-4 py-3
                  "
                >
                  <CheckCircle2 size={18} className="text-success" />

                  <div>
                    <p
                      className="
                        text-sm
                        font-semibold
                        text-success
                      "
                    >
                      {t("PIC/anggota dipilih", "PIC/member selected")}
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
                  {t(
                    "Division wajib dipilih sebelum memilih PIC/anggota",
                    "Select a division before choosing a PIC/member",
                  )}
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

    {t("Deadline", "Deadline")}
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
    placeholderText={t("Pilih deadline & jam", "Select deadline & time")}
    popperPlacement="bottom-start"
    showPopperArrow={false}
    isClearable
    calendarClassName="
      rounded-card
      border
      border-line
      shadow-2xl
    "
    className="
      w-full
      rounded-card
      border border-line
      bg-surface
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
    {t(
      "Tentukan batas waktu pengerjaan request",
      "Set the deadline for working on the request",
    )}
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
                {t("Estimasi jam", "Estimated hours")}
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
                  rounded-card
                  border border-line
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
                {t("Prioritas", "Priority")}
              </label>

              <div
                className="
                  grid grid-cols-2
                  gap-3
                  md:grid-cols-4
                "
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,

                        priority: option.value,
                      }))
                    }
                    className={`
                      rounded-card
                      border
                      px-4 py-3
                      text-sm font-medium
                      capitalize
                      transition
                      ${
                        form.priority === option.value
                          ? "border-accent bg-accent text-white"
                          : "border-line bg-surface hover:bg-surface-muted"
                      }
                    `}
                  >
                    {t(option.label, option.labelEn)}
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
              {t("Catatan assignment", "Assignment notes")}
            </label>

            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,

                  notes: e.target.value,
                }))
              }
              placeholder={t(
                "Tambahkan brief atau instruksi tambahan...",
                "Add a brief or extra instructions...",
              )}
              className="
                min-h-[120px]
                w-full
                rounded-card
                border border-line
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
            border-t border-line
            px-6 py-5
          "
        >
          <button
            type="button"
            onClick={onClose}
            className="
              rounded-card
              border border-line
              px-5 py-3
              font-medium
              transition
              hover:bg-surface-muted
            "
          >
            {t("Batal", "Cancel")}
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={assignMutation.isPending}
            className="
              flex items-center gap-2
              rounded-card
              bg-accent
              px-5 py-3
              font-medium
              text-white
              transition
              hover:bg-accent-strong
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {assignMutation.isPending && (
              <Loader2 size={18} className="animate-spin" />
            )}

            {assignMutation.isPending
              ? t("Menyimpan...", "Saving...")
              : t("Tugaskan request", "Assign request")}
          </button>
        </div>
      </div>
    </div>
  );
}
