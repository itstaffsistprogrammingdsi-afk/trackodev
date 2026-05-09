import { useForm } from "react-hook-form";
import { createCampaign } from "../api/campaign.api";
import { useState } from "react";
import { User } from "../types";
import MemberMentionInput from "./MemberMentionInput";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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
      alert("Gagal membuat campaign");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl w-[450px] space-y-5">

        <h2 className="font-semibold text-lg">
          Create Campaign
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* NAME */}
          <input
            {...register("name", { required: true })}
            placeholder="Campaign name"
            className="w-full border p-2 rounded"
          />

          {/* DESCRIPTION */}
          <textarea
            {...register("description")}
            placeholder="Description"
            className="w-full border p-2 rounded"
          />

          {/* 🔥 DATE SECTION (IMPROVED UX) */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600">
              Due Date
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
              placeholderText="Select due date"
              className="w-full border p-2 rounded bg-white dark:bg-gray-800"
              minDate={new Date()}
              isClearable
            />
          </div>

          {/* TYPE */}
          <select
            {...register("type")}
            className="w-full border p-2 rounded"
          >
            <option value="group">Team</option>
            <option value="personal">Personal</option>
          </select>

          {/* MEMBERS */}
          <div>
            <p className="text-sm font-medium mb-1">
              Assign Members
            </p>

            <MemberMentionInput onSelect={handleSelectUser} />

            <div className="flex flex-wrap gap-2 mt-2">
              {selectedUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
                >
                  {u.name}
                  <button
                    type="button"
                    onClick={() => removeUser(u.id)}
                    className="ml-1 text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ACTION */}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}>
              Cancel
            </button>

            <button
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}