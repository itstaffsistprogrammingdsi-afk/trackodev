import axios from "@/lib/axios";
import type { Form } from "../types";

// ================================
// GET ALL PUBLISHED FORMS
// ================================
export async function getPublicForms(): Promise<Form[]> {
  const { data } = await axios.get("/public/form-center");

  return data;
}

// ================================
// GET SINGLE PUBLIC FORM
// ================================
export async function getPublicForm(
  slug: string
): Promise<Form> {
  const { data } = await axios.get(`/public/forms/${slug}`);

  return data;
}

// ================================
// SUBMIT PUBLIC FORM
// ================================
export async function submitPublicForm(
  slug: string,
  payload: FormData
) {
  const { data } = await axios.post(
    `/public/forms/${slug}/submit`,
    payload,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return data;
}