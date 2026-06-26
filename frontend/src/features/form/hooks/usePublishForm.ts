import { useState } from "react";
import { publishForm } from "../api/form.api";
import type { Form } from "../types";

export function usePublishForm(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);

  const publish = async (form: Form) => {
    try {
      setLoading(true);

      const description =
        window.prompt(
          "Description",
          form.publish_description ??
            form.description ??
            ""
        ) ?? "";

      await publishForm(form.id, {
        is_published: !form.is_published,
        publish_order: form.publish_order ?? 1,
        publish_category:
          form.publish_category ?? "General",
        publish_icon:
          form.publish_icon ?? "document",
        publish_description: description,
      });

      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert("Failed to update publish status.");
    } finally {
      setLoading(false);
    }
  };

  return {
    publish,
    loading,
  };
}