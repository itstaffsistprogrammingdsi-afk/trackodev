import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Pencil,
  Shield,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";

import EditDivisionModal from "../modals/EditDivisionModal";

import { useDeleteDivision } from "../../hooks/useDivisions";

import type { Division } from "../../types";
import type { User } from "../../../user/types";

type Props = {
  division: Division;
  onManageMembers?: (
    division: Division
  ) => void;
};

export default function DivisionCard({
  division,
  onManageMembers,
}: Props) {
  const navigate = useNavigate();

  const deleteMutation =
    useDeleteDivision();

  const [showEditModal, setShowEditModal] =
    useState(false);

  const users: User[] =
    division.users ?? [];

  const adminCount =
    users.filter(
      (user) =>
        user.division_role === "admin"
    ).length;

  const memberCount =
    users.filter(
      (user) =>
        user.division_role === "member"
    ).length;

  const handleDelete = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();

    const confirmed =
      window.confirm(
        `Hapus divisi "${division.name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(
        division.id
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();
    setShowEditModal(true);
  };

  const handleManageTeam = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();

    onManageMembers?.(division);
  };

  return (
    <>
      <div
        onClick={() =>
          navigate(
            `/divisions/${division.id}`
          )
        }
        className="
          group
          bg-white
          border
          border-slate-200
          rounded-2xl
          p-6
          shadow-sm
          hover:shadow-lg
          hover:border-blue-300
          transition-all
          duration-200
          cursor-pointer
        "
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="
                h-12
                w-12
                rounded-xl
                bg-blue-50
                flex
                items-center
                justify-center
                shrink-0
              "
            >
              <Building2
                className="
                  h-6
                  w-6
                  text-blue-600
                "
              />
            </div>

            <div className="min-w-0">
              <h2
                className="
                  text-lg
                  font-semibold
                  text-slate-900
                  truncate
                "
              >
                {division.name}
              </h2>

              {division.code && (
                <span
                  className="
                    inline-flex
                    mt-1
                    px-2
                    py-1
                    text-xs
                    font-medium
                    rounded-full
                    bg-blue-100
                    text-blue-700
                  "
                >
                  {division.code}
                </span>
              )}
            </div>
          </div>

          <ArrowRight
            className="
              h-5
              w-5
              text-slate-400
              group-hover:text-blue-600
              transition
              shrink-0
            "
          />
        </div>

        {/* Statistics */}
        <div
          className="
            mt-5
            grid
            grid-cols-2
            gap-3
          "
        >
          <div
            className="
              rounded-xl
              bg-slate-50
              p-3
            "
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />

              <span className="text-xs text-slate-500">
                Members
              </span>
            </div>

            <p
              className="
                mt-1
                text-lg
                font-bold
                text-slate-900
              "
            >
              {memberCount}
            </p>
          </div>

          <div
            className="
              rounded-xl
              bg-slate-50
              p-3
            "
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-500" />

              <span className="text-xs text-slate-500">
                Admins
              </span>
            </div>

            <p
              className="
                mt-1
                text-lg
                font-bold
                text-slate-900
              "
            >
              {adminCount}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="
            mt-5
            pt-4
            border-t
            border-slate-100
          "
        >
          <div className="mb-3">
            <span
              className="
                text-xs
                text-slate-400
              "
            >
              ID: {division.id.slice(0, 8)}...
            </span>
          </div>

          <div
            className="
              flex
              flex-wrap
              gap-2
            "
          >
            <button
              type="button"
              onClick={handleManageTeam}
              className="
                inline-flex
                items-center
                gap-2
                px-3
                py-2
                text-sm
                font-medium
                rounded-lg
                border
                border-emerald-200
                text-emerald-700
                hover:bg-emerald-50
                transition
              "
            >
              <UserCog className="h-4 w-4" />
              Manage Team
            </button>

            <button
              type="button"
              onClick={handleEdit}
              className="
                inline-flex
                items-center
                gap-2
                px-3
                py-2
                text-sm
                font-medium
                rounded-lg
                border
                border-blue-200
                text-blue-700
                hover:bg-blue-50
                transition
              "
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={
                deleteMutation.isPending
              }
              className="
                inline-flex
                items-center
                gap-2
                px-3
                py-2
                text-sm
                font-medium
                rounded-lg
                border
                border-red-200
                text-red-600
                hover:bg-red-50
                transition
                disabled:opacity-50
              "
            >
              <Trash2 className="h-4 w-4" />

              {deleteMutation.isPending
                ? "Deleting..."
                : "Delete"}
            </button>
          </div>
        </div>
      </div>

      <EditDivisionModal
        open={showEditModal}
        division={division}
        onClose={() =>
          setShowEditModal(false)
        }
      />
    </>
  );
}