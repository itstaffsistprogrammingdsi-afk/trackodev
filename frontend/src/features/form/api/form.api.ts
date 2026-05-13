import api from "@/lib/axios";
import { Form, FormField, FormSubmission, ForwardSubmissionResponse } from "../types";

/*
|--------------------------------------------------------------------------
| FORM
|--------------------------------------------------------------------------
*/

export const getForms = async (): Promise<Form[]> => {
  const res = await api.get("/forms");
  return res.data;
};

export const getForm = async (id: string): Promise<Form> => {
  const res = await api.get(`/forms/${id}`);
  return res.data;
};

export const createForm = async (payload: FormData): Promise<Form> => {
  const res = await api.post("/forms", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

export const updateForm = async (
  id: string,
  payload: FormData
): Promise<Form> => {
  const res = await api.post(`/forms/${id}?_method=PUT`, payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

export const deleteForm = async (id: string) => {
  const res = await api.delete(`/forms/${id}`);
  return res.data;
};

/*
|--------------------------------------------------------------------------
| FORM FIELD
|--------------------------------------------------------------------------
*/

export const createField = async (
  formId: string,
  payload: Partial<FormField>
): Promise<FormField> => {
  const res = await api.post(`/forms/${formId}/fields`, {
    ...payload,
    form_id: formId,
  });

  return res.data;
};

export const updateField = async (
  fieldId: string,
  payload: Partial<FormField>
): Promise<FormField> => {
  const res = await api.put(`/form-fields/${fieldId}`, payload);
  return res.data;
};

export const deleteField = async (fieldId: string) => {
  const res = await api.delete(`/form-fields/${fieldId}`);
  return res.data;
};

/*
|--------------------------------------------------------------------------
| SUBMISSION
|--------------------------------------------------------------------------
*/

export const getSubmissions = async (
  formId: string
): Promise<FormSubmission[]> => {
  const res = await api.get(`/forms/${formId}/submissions`);
  return res.data;
};

export const submitForm = async (
  formId: string,
  data: Record<string, unknown>
): Promise<FormSubmission> => {
  const res = await api.post(`/forms/${formId}/submissions`, { data });
  return res.data;
};

export const forwardSubmission = async (
  submissionId: string,
  cardId: string
): Promise<ForwardSubmissionResponse> => {
  const res = await api.patch(
    `/form-submissions/${submissionId}/forward`,
    {
      card_id: cardId,
    }
  );

  return res.data;
};