import { useCallback, useEffect, useState } from "react";

import { getAvailableForms } from "../api/landing.api";
import type { FormItem } from "../types";

export const useLanding = () => {
  const [forms, setForms] = useState<FormItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadForms = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getAvailableForms(signal);

      if (!signal?.aborted) {
        setForms(data);
      }
    } catch (requestError: unknown) {
      if (signal?.aborted) return;

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Terjadi kesalahan yang tidak diketahui",
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void loadForms(controller.signal);

    return () => controller.abort();
  }, [loadForms]);

  const reload = useCallback(() => {
    void loadForms();
  }, [loadForms]);

  return { forms, isLoading, error, reload };
};
