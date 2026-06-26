import type { Form } from "../types";
import { FileText, Rocket } from "lucide-react";

type Props = {
  forms: Form[];
};

export default function FormStats({ forms }: Props) {
  const total = forms.length;
  const published = forms.filter((f) => f.is_published).length;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Form Overview
        </h2>

        <p className="text-sm text-gray-500">
          Quick summary of your published forms.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <FileText
              size={20}
              className="text-indigo-600"
            />
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Total Forms
            </p>

            <p className="text-xl font-bold text-gray-900">
              {total}
            </p>
          </div>
        </div>

        <div className="h-10 w-px bg-gray-200 hidden sm:block" />

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
            <Rocket
              size={20}
              className="text-green-600"
            />
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Published
            </p>

            <p className="text-xl font-bold text-gray-900">
              {published}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}