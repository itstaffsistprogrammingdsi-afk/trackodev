import api from "@/lib/axios";

import type { FormDetail, FormItem } from "../types";

export const getAvailableForms = async (
  signal?: AbortSignal,
): Promise<FormItem[]> => {
  const response = await api.get<FormItem[]>("/public/forms", { signal });

  return Array.isArray(response.data) ? response.data : [];
};

export const getPublicFormBySlug = async (
  slug: string,
): Promise<FormDetail> => {
  const response = await api.get<FormDetail>(`/public/forms/${slug}`);

  return response.data;
};
