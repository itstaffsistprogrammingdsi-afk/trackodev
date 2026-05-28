import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";

import {
  assignSubmission,
  AssignSubmissionPayload,
} from "../api/form.api";

type AssignSubmissionMutation = {
  submissionId: string;
  payload: AssignSubmissionPayload;
};

type ApiErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

export default function useAssignSubmission() {
  return useMutation<
    unknown,
    AxiosError<ApiErrorResponse>,
    AssignSubmissionMutation
  >({
    mutationFn: ({
      submissionId,
      payload,
    }) =>
      assignSubmission(
        submissionId,
        payload
      ),
  });
}