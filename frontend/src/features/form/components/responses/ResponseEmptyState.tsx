import { Inbox } from "lucide-react";

import type { Form } from "../../types";
import EmptyState from "@/components/ui/EmptyState";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  form?: Form;
};

export default function ResponseEmptyState({ form }: Props) {
  const { t } = useLanguage();

  return (
    <EmptyState
      icon={Inbox}
      title={t("Belum ada respons", "No responses yet")}
      description={t(
        "Bagikan link form ke tim atau audiens. Jawaban yang masuk akan muncul di sini.",
        "Share the form link with your team or audience. Incoming answers will appear here.",
      )}
      action={
        form
          ? {
              label: t("Buka form publik", "Open public form"),
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
