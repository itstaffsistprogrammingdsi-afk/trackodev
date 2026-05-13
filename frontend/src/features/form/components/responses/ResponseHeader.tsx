import { FileText } from "lucide-react";

import type { Form } from "../../types";

type Props = {
  form: Form;
  total: number;
};

export default function ResponseHeader({
  form,
  total,
}: Props) {
  return (
    <div className="rounded-3xl border bg-white p-6">
      <div className="flex justify-between">

        <div>
          <h1 className="text-xl font-bold">
            Submission Responses
          </h1>

          <p className="text-sm text-gray-500">
            Form: <b>{form.name}</b>
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm">
          <FileText className="h-4 w-4" />

          {total}
        </div>
      </div>
    </div>
  );
}