import { Inbox } from "lucide-react";

import type { Form } from "../../types";
import EmptyState from "@/components/ui/EmptyState";

type Props = {
  form?: Form;
};

export default function ResponseEmptyState({ form }: Props) {
  return (
    <EmptyState
      icon={Inbox}
      title="Belum ada respons"
      description="Bagikan link form ke tim atau audiens. Jawaban yang masuk akan muncul di sini."
      action={
        form
          ? {
              label: "Buka form publik",
              onClick: () =>
                window.open(
                  `${window.location.origin}/public/forms/${form.slug}`,
                  "_blank",
                  "noopener,noreferrer",
                ),
            }
          : undefined
      }
    />
  );
}
