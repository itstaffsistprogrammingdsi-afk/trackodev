import {
  CalendarDays,
  Eye,
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

  toggleExpanded: (id: string) => void;
};

export default function ResponseMobileList({
  form,
  submissions,
  expandedRows,
  summaryFields,
  toggleExpanded,
}: Props) {
  return (
    <div className="grid gap-4 xl:hidden">
      {submissions.map((s, i) => {
        const isOpen = expandedRows.includes(
          String(s.id)
        );

        return (
          <div
            key={s.id}
            className="rounded-3xl border bg-white"
          >
            <div className="flex justify-between border-b bg-gray-50 p-4">

              <div>
                <p className="font-semibold">
                  #{i + 1}
                </p>

                <p className="flex items-center gap-1 text-xs text-gray-500">
                  <CalendarDays className="h-4 w-4" />

                  {formatDate(s.created_at)}
                </p>
              </div>

              <button
                onClick={() =>
                  toggleExpanded(String(s.id))
                }
                className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs"
              >
                <Eye className="h-4 w-4" />

                {isOpen
                  ? "Close"
                  : "Detail"}
              </button>
            </div>

            <div className="space-y-3 p-4">
              {summaryFields.map((f) => (
                <div key={f.id}>
                  <p className="text-xs text-gray-400">
                    {f.label}
                  </p>

                  <RenderCellValue
                    value={s.data?.[f.name]}
                    compact
                  />
                </div>
              ))}
            </div>

            {isOpen && (
              <div className="border-t bg-gray-50 p-4">
                {form.fields?.map((f) => (
                  <div
                    key={f.id}
                    className="mb-4"
                  >
                    <p className="text-xs text-gray-400">
                      {f.label}
                    </p>

                    <RenderCellValue
                      value={s.data?.[f.name]}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}