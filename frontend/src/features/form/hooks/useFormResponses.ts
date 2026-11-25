import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getForm,
  getSubmissions,
} from "../api/form.api";

import type {
  Form,
  FormSubmission,
} from "../types";

import useExpandedRows from "./useExpandedRows";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import { translate } from "@/i18n/translate";

import { exportSubmissionPDF }
from "../components/export/exportSubmissionPDF";

export function useFormResponses(
  id?: string
) {
  const realtimeRevision = useRealtimeRevision([
    "Assignment", "Form", "FormField", "FormSubmission",
  ]);
  const [form, setForm] =
    useState<Form | null>(
      null
    );

  const [
    submissions,
    setSubmissions,
  ] =
    useState<
      FormSubmission[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const {
    expandedRows,
    toggleExpanded,
  } =
    useExpandedRows();

  /*
  |--------------------------------------------------------------------------
  | Assignment modal state
  |--------------------------------------------------------------------------
  */

  const [
    selectedSubmission,
    setSelectedSubmission,
  ] =
    useState<FormSubmission | null>(
      null
    );

  const [
    assignmentOpen,
    setAssignmentOpen,
  ] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | Fetch
  |--------------------------------------------------------------------------
  */

  const fetchData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const [formData, submissionData] = await Promise.all([
        getForm(id),
        getSubmissions(id),
      ]);

      setForm(formData);
      setSubmissions(submissionData);
    } catch (err) {
      console.error(err);
      setError(
        translate(
          "Gagal memuat form dan responses. Silakan coba lagi.",
          "Failed to load the form and responses. Please try again.",
        ),
      );
      setForm(null);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, realtimeRevision]);

  /*
  |--------------------------------------------------------------------------
  | Summary
  |--------------------------------------------------------------------------
  */

  const summaryFields =
    useMemo(
      () =>
        form?.fields?.slice(
          0,
          4
        ) ?? [],
      [form]
    );

  /*
  |--------------------------------------------------------------------------
  | PDF
  |--------------------------------------------------------------------------
  */

  const exportPDF = (
    submission:
      FormSubmission
  ) => {

    if (!form)
      return;

    exportSubmissionPDF(
      form,
      submission
    );

  };

  /*
  |--------------------------------------------------------------------------
  | Assign
  |--------------------------------------------------------------------------
  */

  const onAssign = (
    submission:
      FormSubmission
  ) => {
    if (
      submission.assignment ||
      submission.status === "assigned" ||
      submission.status === "forwarded"
    ) {
      return;
    }

    setSelectedSubmission(
      submission
    );

    setAssignmentOpen(
      true
    );

  };

  return {

    form,
    submissions,
    loading,
    error,
    reload: fetchData,

    expandedRows,
    toggleExpanded,

    summaryFields,

    exportPDF,

    onAssign,

    assignmentOpen,
    setAssignmentOpen,

    selectedSubmission,

  };
}
