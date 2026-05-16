import { useMutation } from "@tanstack/react-query"

import {
  assignSubmission,
  AssignSubmissionPayload
} from "../api/form.api"

export default function useAssignSubmission() {

  return useMutation({

    mutationFn: ({
      submissionId,
      payload
    }:{

      submissionId:string

      payload:
        AssignSubmissionPayload

    }) =>

      assignSubmission(
        submissionId,
        payload
      )

  })

}