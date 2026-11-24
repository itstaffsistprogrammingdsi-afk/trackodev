import jsPDF from "jspdf";

import type {
  Form,
  FormSubmission,
} from "../../types";

import { formatDate } from "../../utils/formatDate";
import { translate } from "@/i18n/translate";

export function exportSubmissionPDF(
  form: Form,
  submission: FormSubmission
) {
  const pdf = new jsPDF("p", "mm", "a4");

  let y = 15;

  pdf.setFont("helvetica", "bold");

  pdf.text(
    translate("Laporan Submission Form", "Form Submission Report"),
    14,
    y
  );

  y += 10;

  pdf.setFont("helvetica", "normal");

  pdf.text(
    translate("Form: {name}", "Form: {name}", { name: form.name }),
    14,
    y
  );

  y += 6;

  pdf.text(
    translate("Dikirim: {date}", "Submitted: {date}", {
      date: formatDate(submission.created_at),
    }),
    14,
    y
  );

  y += 10;

  form.fields?.filter((field) => field.type !== "section").forEach((field) => {
    const value =
      submission.data?.[field.name] ?? "-";

    pdf.setFont("helvetica", "bold");

    pdf.text(`${field.label}:`, 14, y);

    y += 6;

    pdf.setFont("helvetica", "normal");

    pdf.text(String(value), 14, y);

    y += 8;
  });

  pdf.save(`submission-${submission.id}.pdf`);
}
