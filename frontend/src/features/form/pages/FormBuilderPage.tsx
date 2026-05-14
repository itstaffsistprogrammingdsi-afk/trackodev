import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getForm, createField, deleteField } from "../api/form.api";
import type { Form, FormField } from "../types";

export default function FormBuilderPage() {
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);

  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [required, setRequired] = useState(false);

  const [options, setOptions] = useState<string[]>([""]);

  // ✅ OTHER FEATURE (FIXED PROPERLY)
  const [allowOther, setAllowOther] = useState(false);
  const [otherLabel, setOtherLabel] = useState("");

  const fetchForm = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getForm(id);
      setForm(data);
    } catch (error) {
      console.error(error);
      alert("Gagal load form");
    } finally {
      setLoading(false);
    }
  };

  const generateFieldName = (text: string) =>
    text.toLowerCase().replace(/\s+/g, "_").replace(/[^\w]/g, "");

  const handleAddField = async () => {
    if (!id || !label.trim()) {
      alert("Label wajib diisi");
      return;
    }

    try {
      const fieldName = generateFieldName(label);

      const cleanOptions = options
        .map((o) => o.trim())
        .filter(Boolean);

      await createField(id, {
        label,
        name: fieldName,
        type,
        is_required: required,
        order: form?.fields?.length || 0,

        // ❗ IMPORTANT FIX:
        // Only normal options here
        options:
          type === "select" || type === "checkbox"
            ? cleanOptions
            : [],

        // ✔ OTHER IS SEPARATE FLAG
        allow_other: allowOther,
        other_label: allowOther ? (otherLabel.trim() || "Other") : null,
      } as FormField);

      // RESET STATE
      setLabel("");
      setType("text");
      setRequired(false);
      setOptions([""]);
      setAllowOther(false);
      setOtherLabel("");

      await fetchForm();
    } catch (error) {
      console.error(error);
      alert("Gagal menambahkan field");
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm("Hapus field ini?")) return;

    try {
      await deleteField(fieldId);
      await fetchForm();
    } catch (error) {
      console.error(error);
      alert("Gagal hapus field");
    }
  };

  useEffect(() => {
    fetchForm();
  }, [id]);

  if (loading) return <div className="p-6">Loading builder...</div>;
  if (!form) return <div className="p-6 text-red-500">Form not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {form.name}
        </h1>
        <p className="text-sm text-gray-500">Form Builder</p>
      </div>

      {/* CREATE FIELD */}
      <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">

        <div className="grid gap-4 md:grid-cols-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Field label"
            className="rounded-lg border px-3 py-2"
          />

          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setOptions([""]);
              setAllowOther(false);
              setOtherLabel("");
            }}
            className="rounded-lg border px-3 py-2"
          >
            <option value="text">Text</option>
            <option value="textarea">Textarea</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="file">File</option>
            <option value="select">Select</option>
            <option value="checkbox">Checkbox</option>
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
            />
            Required
          </label>
        </div>

        {/* OPTIONS */}
        {(type === "select" || type === "checkbox") && (
          <div className="mt-4">

            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={opt}
                    onChange={(e) => {
                      const updated = [...options];
                      updated[i] = e.target.value;
                      setOptions(updated);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 rounded-lg border px-3 py-2"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const updated = options.filter((_, idx) => idx !== i);
                      setOptions(updated.length ? updated : [""]);
                    }}
                    className="px-3 text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* ADD OPTION */}
            <button
              type="button"
              onClick={() => setOptions([...options, ""])}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              + Add Option
            </button>

            {/* OTHER */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowOther}
                onChange={(e) => setAllowOther(e.target.checked)}
              />
              <span className="text-sm">Allow "Other"</span>
            </div>

            {allowOther && (
              <input
                value={otherLabel}
                onChange={(e) => setOtherLabel(e.target.value)}
                placeholder="Label Other (default: Other)"
                className="mt-2 w-full rounded-lg border px-3 py-2"
              />
            )}
          </div>
        )}

        <button
          onClick={handleAddField}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Add Field
        </button>
      </div>

      {/* FIELD LIST */}
      <div className="rounded-xl border bg-white p-5">
        <h2 className="mb-4 font-semibold">Fields</h2>

        {form.fields?.length ? (
          <div className="space-y-3">
            {form.fields.map((field: FormField) => (
              <div key={field.id} className="rounded border p-4">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{field.label}</div>
                    <div className="text-xs text-gray-500">
                      {field.type}
                    </div>

                    {field.options?.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {field.options.map((o, i) => (
                          <span
                            key={i}
                            className="rounded bg-gray-100 px-2 py-1 text-xs"
                          >
                            {o}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {/* OPTIONAL: SHOW OTHER INDICATOR */}
                    {(field as FormField).allow_other && (
                      <div className="text-xs text-blue-500 mt-1">
                        + Other option enabled
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteField(field.id)}
                    className="text-sm text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">No fields yet</div>
        )}
      </div>
    </div>
  );
}