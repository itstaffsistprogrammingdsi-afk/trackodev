import { useCallback, useEffect, useState } from "react";
import {
  getPublicForms,
  getPublicForm,
  submitPublicForm,
} from "../api/publicForm.api";
import type { Form } from "../types";

export function usePublicForms() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getPublicForms();

      setForms(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load forms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    forms,
    loading,
    error,
    reload: load,
  };
}

export function usePublicForm(slug?: string) {
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError("");

      const data = await getPublicForm(slug);

      setForm(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load form.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (payload: FormData) => {
    if (!slug) return;

    try {
      setSubmitting(true);

      return await submitPublicForm(slug, payload);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    loading,
    submitting,
    error,
    reload: load,
    submit,
  };
}