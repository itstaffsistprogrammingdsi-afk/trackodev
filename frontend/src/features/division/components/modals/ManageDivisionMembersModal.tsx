import { X, Users } from "lucide-react";

import DivisionMembers from "../members/DivisionMembers";
import type { Division } from "../../types";

type Props = {
  open: boolean;
  division: Division | null;
  onClose: () => void;
};

export default function ManageDivisionMembersModal({
  open,
  division,
  onClose,
}: Props) {
  if (!open || !division) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/60
        backdrop-blur-sm
        p-4
      "
      onClick={onClose}
    >
      <div
        className="
          bg-white
          rounded-2xl
          shadow-2xl
          w-full
          max-w-5xl
          max-h-[90vh]
          overflow-hidden
          flex
          flex-col
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="
            flex
            items-center
            justify-between
            px-6
            py-5
            border-b
            bg-gray-50
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                h-11
                w-11
                rounded-xl
                bg-blue-100
                flex
                items-center
                justify-center
              "
            >
              <Users className="h-5 w-5" />
            </div>

            <div>
              <h2
                className="
                  text-xl
                  font-semibold
                  text-gray-900
                "
              >
                Manage Team Members
              </h2>

              <p
                className="
                  text-sm
                  text-gray-500
                "
              >
                {division.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              h-10
              w-10
              rounded-lg
              border
              flex
              items-center
              justify-center
              hover:bg-gray-100
              transition
            "
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div
          className="
            flex-1
            overflow-y-auto
            p-6
          "
        >

          <DivisionMembers
            divisionId={division.id}
          />
        </div>

        {/* Footer */}
        <div
          className="
            border-t
            bg-gray-50
            px-6
            py-4
            flex
            justify-end
          "
        >
          <button
            type="button"
            onClick={onClose}
            className="
              px-4
              py-2
              rounded-lg
              border
              font-medium
              hover:bg-gray-100
              transition
            "
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}