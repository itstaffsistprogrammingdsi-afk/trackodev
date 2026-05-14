import { useParams } from "react-router-dom";

import { useFormResponses } from "../hooks/useFormResponses";

import ResponseHeader from "../components/responses/ResponseHeader";
import ResponseEmptyState from "../components/responses/ResponseEmptyState";
import ResponseMobileList from "../components/responses/ResponseMobileList";
import ResponseTable from "../components/responses/ResponseTable";

export default function FormResponsesPage() {
  const { id } = useParams<{ id: string }>();

  const {
    form,
    submissions,
    loading,
    expandedRows,
    summaryFields,
    toggleExpanded,
    exportPDF,
  } = useFormResponses(id);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-10 text-center text-red-500">
        Form not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1600px] space-y-6">

        <ResponseHeader
          form={form}
          total={submissions.length}
        />

        {submissions.length === 0 ? (
          <ResponseEmptyState />
        ) : (
          <>
            <ResponseMobileList
              form={form}
              submissions={submissions}
              expandedRows={expandedRows}
              summaryFields={summaryFields}
              toggleExpanded={toggleExpanded}
            />

            <ResponseTable
              form={form}
              submissions={submissions}
              expandedRows={expandedRows}
              summaryFields={summaryFields}
              toggleExpanded={toggleExpanded}
              exportPDF={exportPDF}
            />
          </>
        )}
      </div>
    </div>
  );
}