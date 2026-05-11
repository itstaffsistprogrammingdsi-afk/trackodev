import { X, CheckSquare, Clock3 } from "lucide-react";

import { User } from "../types";

interface Props {
  title: string;

  assignees?: User[];

  dueDate: string;

  onClose: () => void;

  onToggleMembers: () => void;
}

export default function CardDetailHeader({
  title,
  assignees,
  dueDate,
  onClose,
  onToggleMembers,
}: Props) {
  return (
    <div className="bg-white border-b px-8 pt-7 pb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* TITLE */}
          <div className="flex items-start gap-3">
            <CheckSquare size={22} className="text-gray-500 mt-1" />

            <div>
              <h1 className="text-2xl font-bold text-gray-800">{title}</h1>

              <p className="text-sm text-gray-500 mt-1">
                in list{" "}
                <span className="font-medium">Active Support Ticket</span>
              </p>
            </div>
          </div>

          {/* MEMBER */}
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase text-gray-500 mb-2">
              Members
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              {assignees?.map((user) => (
                <div
                  key={user.id}
                  title={user.name}
                  className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold"
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              ))}

              <button
                onClick={onToggleMembers}
                className="w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 transition flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          {/* LABEL */}
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase text-gray-500 mb-2">
              Labels
            </p>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-lg bg-red-500 text-white text-sm font-medium">
                p1-critical
              </span>

              <span className="px-3 py-1 rounded-lg bg-cyan-500 text-white text-sm font-medium">
                email-server
              </span>
            </div>
          </div>

          {/* DUE DATE */}
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase text-gray-500 mb-2">
              Due Date
            </p>

            <div className="inline-flex items-center gap-2 bg-gray-200 rounded-lg px-3 py-2 text-sm">
              <Clock3 size={14} className="text-red-500" />

              <span>{dueDate || "No due date"}</span>
            </div>
          </div>
        </div>

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl hover:bg-gray-200 transition flex items-center justify-center"
        >
          <X size={22} />
        </button>
      </div>
    </div>
  );
}
