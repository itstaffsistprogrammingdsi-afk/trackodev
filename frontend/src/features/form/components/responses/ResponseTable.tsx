import { Fragment } from "react";

import {
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";

import type {
  Form,
  FormField,
  FormSubmission,
} from "../../types";

import { formatDate } from "../../utils/formatDate";

import RenderCellValue from "../cells/RenderCellValue";

type Props = {
  form: Form;

  submissions: FormSubmission[];

  expandedRows: string[];

  summaryFields: FormField[];

  toggleExpanded: (
    id: string
  ) => void;

  exportPDF: (
    submission: FormSubmission
  ) => void;

  onAssign: (
    submission: FormSubmission
  ) => void;
};

export default function ResponseTable({
  form,
  submissions,
  expandedRows,
  summaryFields,
  toggleExpanded,
  onAssign,
}: Props) {
  return (
    <div
      className="
        hidden
        overflow-hidden
        rounded-2xl
        border
        border-zinc-200
        bg-white
        xl:block
      "
    >
      <table className="w-full text-sm">
        <thead className="bg-zinc-50">
          <tr className="border-b border-zinc-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
              #
            </th>

            {summaryFields.map(
              (f: FormField) => (
                <th
                  key={f.id}
                  className="px-4 py-3 text-left text-xs font-medium text-zinc-500"
                >
                  {f.label}
                </th>
              )
            )}

            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
              Status
            </th>

            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
              Date
            </th>

            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {submissions.map(
            (
              s: FormSubmission,
              i: number
            ) => {
              const isOpen =
                expandedRows.includes(
                  String(s.id)
                );

              return (
                <Fragment key={s.id}>
                  <tr className="border-b border-zinc-100 hover:bg-zinc-50">
                    {/* NUMBER */}
                    <td className="px-4 py-4 text-zinc-500">
                      {i + 1}
                    </td>

                    {/* SUMMARY */}
                    {summaryFields.map(
                      (
                        f: FormField
                      ) => (
                        <td
                          key={f.id}
                          className="max-w-[220px] px-4 py-4"
                        >
                          <div className="line-clamp-2 text-zinc-700">
                            <RenderCellValue
                              value={
                                s.data?.[
                                  f.name
                                ]
                              }
                              compact
                            />
                          </div>
                        </td>
                      )
                    )}

                    {/* STATUS */}
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <span
                          className={`
                            inline-flex
                            rounded-full
                            px-2.5
                            py-1
                            text-[11px]
                            font-medium
                            capitalize

                            ${
                              s.status ===
                              "assigned"
                                ? "bg-emerald-100 text-emerald-700"
                                : s.status ===
                                    "forwarded"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-amber-100 text-amber-700"
                            }
                          `}
                        >
                          {s.status}
                        </span>

                        {s.assignment && (
                          <div className="text-xs text-zinc-500">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-zinc-700">
                                {s
                                  .assignment
                                  ?.coordinator
                                  ?.name ||
                                  "-"}
                              </span>

                              <ArrowRight
                                size={11}
                              />

                              <span className="font-medium text-indigo-600">
                                {s
                                  .assignment
                                  ?.designer
                                  ?.name ||
                                  "-"}
                              </span>
                            </div>

                            {s
                              .assignment
                              ?.deadline && (
                              <div className="mt-1 text-[11px] text-zinc-400">
                                {formatDate(
                                  s
                                    .assignment
                                    .deadline
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* DATE */}
                    <td className="px-4 py-4 text-zinc-500">
                      {formatDate(
                        s.created_at
                      )}
                    </td>

                    {/* ACTION */}
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            toggleExpanded(
                              String(s.id)
                            )
                          }
                          className="
                            flex
                            items-center
                            gap-1
                            rounded-lg
                            border
                            border-zinc-200
                            px-3
                            py-2
                            text-xs
                            text-zinc-600
                            transition
                            hover:bg-zinc-100
                          "
                        >
                          {isOpen ? (
                            <ChevronUp
                              size={14}
                            />
                          ) : (
                            <ChevronDown
                              size={14}
                            />
                          )}

                          {isOpen
                            ? "Hide"
                            : "View"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onAssign(s)
                          }
                          disabled={
                            s.status ===
                            "assigned"
                          }
                          className="
                            flex
                            items-center
                            gap-1.5
                            rounded-lg
                            bg-indigo-600
                            px-3
                            py-2
                            text-xs
                            font-medium
                            text-white
                            transition
                            hover:bg-indigo-700
                            disabled:cursor-not-allowed
                            disabled:bg-zinc-300
                          "
                        >
                          <ClipboardCheck
                            size={14}
                          />

                          {s.status ===
                          "assigned"
                            ? "Assigned"
                            : "Assign"}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* EXPANDED */}
                  {isOpen && (
                    <tr>
                      <td
                        colSpan={
                          summaryFields.length +
                          4
                        }
                        className="bg-zinc-50 p-5"
                      >
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {form.fields?.map(
                            (
                              f: FormField
                            ) => (
                              <div
                                key={f.id}
                                className="
                                  rounded-xl
                                  border
                                  border-zinc-200
                                  bg-white
                                  p-3
                                "
                              >
                                <p className="mb-1 text-[11px] text-zinc-400">
                                  {f.label}
                                </p>

                                <div className="text-sm text-zinc-700">
                                  <RenderCellValue
                                    value={
                                      s.data?.[
                                        f.name
                                      ]
                                    }
                                  />
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            }
          )}
        </tbody>
      </table>
    </div>
  );
}