import jsPDF from "jspdf";

import type {
  Form,
  FormSubmission,
} from "../../types";

import { formatDate } from "../../utils/formatDate";

export function exportSubmissionPDF(
  form: Form,
  submission: FormSubmission
) {
  const pdf = new jsPDF("p", "mm", "a4");

  let y = 15;

  pdf.setFont("helvetica", "bold");

  pdf.text(
    "Form Submission Report",
    14,
    y
  );

  y += 10;

  pdf.setFont("helvetica", "normal");

  pdf.text(`Form: ${form.name}`, 14, y);

  y += 6;

  pdf.text(
    `Submitted: ${formatDate(
      submission.created_at
    )}`,
    14,
    y
  );

  y += 10;

  form.fields?.forEach((field) => {
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