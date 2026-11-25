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
import { useLanguage } from "@/context/LanguageContext";

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
  const { t } = useLanguage();

  return (
    <div className="grid gap-4 xl:hidden">
      {submissions.map((s, i) => {
        const isOpen = expandedRows.includes(
          String(s.id)
        );

        return (
          <div
            key={s.id}
            className="rounded-panel border bg-surface"
          >
            <div className="flex justify-between border-b bg-surface-muted/40 p-4">

              <div>
                <p className="font-semibold">
                  #{i + 1}
                </p>

                <p className="flex items-center gap-1 text-xs text-fg-muted">
                  <CalendarDays className="h-4 w-4" />

                  {formatDate(s.created_at)}
                </p>
              </div>

              <button
                onClick={() =>
                  toggleExpanded(String(s.id))
                }
                className="flex items-center gap-2 rounded-control border px-3 py-2 text-xs"
              >
                <Eye className="h-4 w-4" />

                {isOpen
                  ? t("Tutup", "Close")
                  : t("Detail", "Details")}
              </button>
            </div>

            <div className="space-y-3 p-4">
              {summaryFields.map((f) => (
                <div key={f.id}>
                  <p className="text-xs text-fg-subtle">
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
              <div className="border-t bg-surface-muted/40 p-4">
                {form.fields?.filter((f) => f.type !== "section").map((f) => (
                  <div
                    key={f.id}
                    className="mb-4"
                  >
                    <p className="text-xs text-fg-subtle">
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
