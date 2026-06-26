import type { Form } from "../types";
import PublicFormCard from "./PublicFormCard";

type Props = {
    forms: Form[];
    loading?: boolean;
    publicMode?: boolean;
};

export default function FormGrid({
  forms,
}: Props) {
  return (
    <section
      id="forms"
      className="mt-12"
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

        {forms.map((form) => (
          <PublicFormCard
            key={form.id}
            form={form}
          />
        ))}

      </div>
    </section>
  );
}