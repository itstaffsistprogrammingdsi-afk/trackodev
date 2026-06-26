import { FileText } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-24 text-center">

      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">

        <FileText
          size={34}
          className="text-indigo-600"
        />

      </div>

      <h2 className="mt-6 text-2xl font-bold text-slate-900">
        No Forms Available
      </h2>

      <p className="mt-3 text-slate-500">
        There are currently no published forms.
      </p>

    </div>
  );
}