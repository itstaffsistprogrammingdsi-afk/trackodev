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
import { useLanguage } from "@/context/LanguageContext";

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

  canAssign: boolean;
};

export default function ResponseTable({
  form,
  submissions,
  expandedRows,
  summaryFields,
  toggleExpanded,
  onAssign,
  canAssign,
}: Props) {
  const { t } = useLanguage();

  return (
    <div
      className="
        hidden
        overflow-x-auto
        rounded-card
        border
        border-line
        bg-surface
        xl:block
      "
    >
      <table className="w-full min-w-[1080px] text-sm">
        <thead className="bg-surface-muted/40">
          <tr className="border-b border-line">
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
              {t("Status", "Status")}
            </th>

            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
              {t("Tanggal", "Date")}
            </th>

            <th className="sticky right-0 z-20 min-w-[210px] border-l border-line bg-surface-muted/40 px-4 py-3 text-center text-xs font-medium text-zinc-500">
              {t("Aksi", "Action")}
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
              const isAssigned =
                Boolean(s.assignment) ||
                s.status === "assigned" ||
                s.status === "forwarded";

              return (
                <Fragment key={s.id}>
                  <tr className="border-b border-zinc-100 hover:bg-surface-muted/40">
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
                                ? "bg-emerald-100 text-success"
                                : s.status ===
                                    "forwarded"
                                  ? "bg-accent-soft text-accent"
                                  : "bg-amber-100 text-warning"
                            }
                          `}
                        >
                          {s.status}
                        </span>

                        {s.assignment && (
                          <div className="text-xs text-zinc-500">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-zinc-700">
                                {t("Koordinator: {name}", "Coordinator: {name}", {
                                  name: s.assignment?.coordinator?.name || "-",
                                })}
                              </span>

                              <ArrowRight
                                size={11}
                              />

                              <span className="font-medium text-accent">
                                {t("PIC: {name}", "PIC: {name}", {
                                  name: s.assignment?.designer?.name || "-",
                                })}
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
                    <td className="sticky right-0 z-10 min-w-[210px] border-l border-line bg-surface px-4 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            toggleExpanded(
                              String(s.id)
                            )
                          }
                          className="
                            flex
                            shrink-0
                            items-center
                            gap-1
                            whitespace-nowrap
                            rounded-control
                            border
                            border-line
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
                            ? t("Sembunyikan", "Hide")
                            : t("Lihat", "View")}
                        </button>

                        <button
                          hidden={!canAssign}
                          type="button"
                          onClick={() =>
                            onAssign(s)
                          }
                          disabled={
                            isAssigned
                          }
                          className="
                            flex
                            shrink-0
                            items-center
                            gap-1.5
                            whitespace-nowrap
                            rounded-control
                            bg-accent
                            px-3
                            py-2
                            text-xs
                            font-medium
                            text-white
                            transition
                            hover:bg-accent-strong
                            disabled:cursor-not-allowed
                            disabled:bg-zinc-300
                          "
                        >
                          <ClipboardCheck
                            size={14}
                          />

                          {isAssigned
                            ? t("Sudah ditugaskan", "Assigned")
                            : t("Tugaskan", "Assign")}
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
                        className="bg-surface-muted/40 p-5"
                      >
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {form.fields?.filter((f) => f.type !== "section").map(
                            (
                              f: FormField
                            ) => (
                              <div
                                key={f.id}
                                className="
                                  rounded-control
                                  border
                                  border-line
                                  bg-surface
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
