import { Fragment } from "react";

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

  toggleExpanded: (id: string) => void;

  exportPDF: (
    submission: FormSubmission
  ) => void;
};

export default function ResponseTable({
  form,
  submissions,
  expandedRows,
  summaryFields,
  toggleExpanded,
  exportPDF,
}: Props) {
  return (
    <div className="hidden overflow-hidden rounded-3xl border bg-white xl:block">
      <table className="w-full text-sm">

        <thead className="bg-gray-50">
          <tr>
            <th className="p-4 text-left">
              #
            </th>

            {summaryFields.map((f) => (
              <th
                key={f.id}
                className="p-4 text-left"
              >
                {f.label}
              </th>
            ))}

            <th className="p-4">
              Date
            </th>

            <th className="p-4">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {submissions.map((s, i) => {
            const isOpen =
              expandedRows.includes(
                String(s.id)
              );

            return (
              <Fragment key={s.id}>
                <tr className="border-t hover:bg-gray-50">

                  <td className="p-4">
                    {i + 1}
                  </td>

                  {summaryFields.map((f) => (
                    <td
                      key={f.id}
                      className="p-4"
                    >
                      <RenderCellValue
                        value={
                          s.data?.[f.name]
                        }
                        compact
                      />
                    </td>
                  ))}

                  <td className="p-4">
                    {formatDate(
                      s.created_at
                    )}
                  </td>

                  <td className="flex gap-2 p-4">
                    <button
                      onClick={() =>
                        toggleExpanded(
                          String(s.id)
                        )
                      }
                      className="rounded-xl border px-3 py-2 text-xs"
                    >
                      {isOpen
                        ? "Hide"
                        : "View"}
                    </button>

                    <button
                      onClick={() =>
                        exportPDF(s)
                      }
                      className="rounded-xl border px-3 py-2 text-xs"
                    >
                      PDF
                    </button>
                  </td>
                </tr>

                {isOpen && (
                  <tr>
                    <td
                      colSpan={10}
                      className="bg-gray-50 p-6"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        {form.fields?.map(
                          (f) => (
                            <div
                              key={f.id}
                              className="rounded-2xl border bg-white p-4"
                            >
                              <p className="text-xs text-gray-400">
                                {f.label}
                              </p>

                              <RenderCellValue
                                value={
                                  s.data?.[
                                    f.name
                                  ]
                                }
                              />
                            </div>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}