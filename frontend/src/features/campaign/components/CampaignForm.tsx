import { useForm } from "react-hook-form";
import { createCampaign } from "../api/campaign.api";
import { useState } from "react";
import { User } from "../types";
import MemberMentionInput from "./MemberMentionInput";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { X } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "@/lib/feedback";

type Props = {
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
};

type FormData = {
  name: string;
  description?: string;
  type: "personal" | "group";
  due_date?: string;
  member_ids: string[];
};

export default function CampaignForm({
  workspaceId,
  onClose,
  onSuccess,
}: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      member_ids: [],
      type: "group",
    },
  });

  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const memberIds = watch("member_ids");
  const isSuperAdmin = user?.roles?.includes("super_admin") ?? false;
  const isAdmin = user?.roles?.some((role) => ["admin", "manager"].includes(role)) ?? false;

  // ADD MEMBER
  const handleSelectUser = (user: User) => {
    if (memberIds.includes(user.id)) return;

    const updated = [...memberIds, user.id];

    setValue("member_ids", updated, {
      shouldValidate: true,
      shouldDirty: true,
    });

    setSelectedUsers((prev) => [...prev, user]);
  };

  // REMOVE MEMBER
  const removeUser = (id: string) => {
    setValue(
      "member_ids",
      memberIds.filter((m) => m !== id),
      { shouldValidate: true, shouldDirty: true }
    );

    setSelectedUsers((prev) =>
      prev.filter((u) => u.id !== id)
    );
  };

  // SUBMIT
  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      await createCampaign(workspaceId, {
        ...data,
        due_date: dueDate
          ? dueDate.toISOString().split("T")[0]
          : undefined,
      });

      reset();
      setSelectedUsers([]);
      setDueDate(null);

      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error(t("Gagal membuat campaign", "Failed to create campaign"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[450px] max-h-[90dvh] overflow-y-auto rounded-t-modal bg-surface p-6 space-y-5 dark:bg-surface sm:rounded-card">

        <h2 className="font-semibold text-lg">
          {t("Buat Campaign", "Create campaign")}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* NAME */}
          <input
            {...register("name", { required: true })}
            placeholder={t("Nama campaign", "Campaign name")}
            className="w-full border p-2 rounded"
          />

          {/* DESCRIPTION */}
          <textarea
            {...register("description")}
            placeholder={t("Deskripsi", "Description")}
            className="w-full border p-2 rounded"
          />

          {/* 🔥 DATE SECTION (IMPROVED UX) */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-fg-muted">
              {t("Tenggat", "Due date")}
            </label> <br />

            <DatePicker
              selected={dueDate}
              onChange={(date: Date | null) => {
                setDueDate(date);

                setValue(
                  "due_date",
                  date
                    ? date.toISOString().split("T")[0]
                    : "",
                  {
                    shouldValidate: true,
                    shouldDirty: true,
                  }
                );
              }}
              dateFormat="dd MMMM yyyy"
              placeholderText={t("Pilih tanggal", "Select due date")}
              className="w-full border p-2 rounded-control bg-surface dark:bg-surface-muted"
              minDate={new Date()}
              isClearable
            />
          </div>

          {/* TYPE */}
          <select
            {...register("type")}
            className="w-full border p-2 rounded"
          >
            <option value="group">{t("Tim", "Team")}</option>
            <option value="personal">{t("Personal")}</option>
          </select>

          {/* MEMBERS */}
          <div>
            <p className="mb-1 text-xs font-medium text-fg-muted">
              {t("Anggota campaign", "Campaign members")}
            </p>

            <p className="mb-2 text-2xs leading-5 text-fg-subtle">
              {isSuperAdmin
                ? t(
                    "Super Admin dapat memilih user dari seluruh sistem.",
                    "Super admins can pick users from the entire system.",
                  )
                : t(
                    "Pilih anggota dari divisi mana pun. Admin divisi asal akan menerima notifikasi untuk undangan lintas divisi.",
                    "Pick members from any division. Admins of the origin division will be notified about cross-division invitations.",
                  )}
            </p>

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
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-2.5 pr-1 text-2xs font-medium text-accent"
                  >
                    {user.name}
                    <button
                      type="button"
                      onClick={() => removeUser(user.id)}
                      aria-label={t("Batalkan {name}", "Remove {name}", {
                        name: user.name,
                      })}
                      className="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-accent/15"
                    >
                      <X size={11} aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* ACTION */}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 rounded-control border border-line bg-surface px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              {t("Batal", "Cancel")}
            </button>

            <button
              disabled={loading}
              className="h-9 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-50"
            >
              {loading ? t("Menyimpan…", "Saving…") : t("Buat campaign", "Create campaign")}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
