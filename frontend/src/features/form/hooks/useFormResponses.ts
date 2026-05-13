import { useEffect, useMemo, useState } from "react";

import { getForm, getSubmissions } from "../api/form.api";

import type {
  Form,
  FormSubmission,
} from "../types";

import useExpandedRows from "./useExpandedRows";

import { exportSubmissionPDF } from "../components/export/exportSubmissionPDF";

export function useFormResponses(id?: string) {
  const [form, setForm] = useState<Form | null>(null);

  const [submissions, setSubmissions] =
    useState<FormSubmission[]>([]);

  const [loading, setLoading] =
    useState(true);

  const {
    expandedRows,
    toggleExpanded,
  } = useExpandedRows();

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);

      try {
        const [formData, submissionData] =
          await Promise.all([
            getForm(id),
            getSubmissions(id),
          ]);

        setForm(formData);
        setSubmissions(submissionData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const summaryFields = useMemo(
    () => form?.fields?.slice(0, 4) ?? [],
    [form]
  );

  const exportPDF = (
    submission: FormSubmission
  ) => {
    if (!form) return;

    exportSubmissionPDF(form, submission);
  };

  return {
    form,
    submissions,
    loading,

    expandedRows,
    toggleExpanded,

    summaryFields,

    exportPDF,
  };
}