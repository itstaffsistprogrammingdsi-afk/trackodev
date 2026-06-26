import {
  ArrowRight,
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Form } from "../types";

type Props = {
  form: Form;
};

export default function PublicFormCard({
  form,
}: Props) {
  return (
    <Link
      to={`/public/forms/${form.slug}`}
      className="group block"
    >
      <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl">

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">

          <FileText
            className="text-indigo-600"
            size={26}
          />

        </div>

        <h2 className="text-xl font-bold text-slate-900">
          {form.name}
        </h2>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
          {form.publish_description ??
            form.description ??
            "No description"}
        </p>

        <div className="mt-6 flex items-center justify-between">

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {form.publish_category ?? "General"}
          </span>

          <span className="flex items-center gap-2 text-sm font-semibold text-indigo-600">

            Open

            <ArrowRight
              size={16}
              className="transition group-hover:translate-x-1"
            />

          </span>

        </div>

      </div>
    </Link>
  );
}