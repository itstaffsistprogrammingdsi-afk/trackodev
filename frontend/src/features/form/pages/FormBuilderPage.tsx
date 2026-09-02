import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { Pencil, Trash2, X } from "lucide-react";
import {
  getForm,
  createField,
  updateField,
  deleteField,
} from "../api/form.api";
import type { Form, FormField } from "../types";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";

export default function FormBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const canCreateField = can('form.field.create') || can('form.update');
  const canUpdateField = can('form.field.update') || can('form.update');
  const canDeleteField = can('form.field.delete') || can('form.update');
  const realtimeRevision = useRealtimeRevision(["Form", "FormField"]);

  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);

  const [label, setLabel] = useState("");
  const [type, setType] = useState<FormField["type"]>("text");
  const [required, setRequired] = useState(false);

  const [options, setOptions] = useState<string[]>([""]);

  // ✅ OTHER FEATURE (FIXED PROPERLY)
  const [allowOther, setAllowOther] = useState(false);
  const [otherLabel, setOtherLabel] = useState("");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [savingField, setSavingField] = useState(false);

  const fetchForm = useCallback(async () => {
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
  }, [id]);

  const generateFieldName = (text: string) =>
    text.toLowerCase().replace(/\s+/g, "_").replace(/[^\w]/g, "");

  const resetFieldEditor = () => {
    setEditingFieldId(null);
    setLabel("");
    setType("text");
    setRequired(false);
    setOptions([""]);
    setAllowOther(false);
    setOtherLabel("");
  };

  const handleStartEditField = (field: FormField) => {
    setEditingFieldId(field.id);
    setLabel(field.label);
    setType(field.type);
    setRequired(Boolean(field.is_required));
    setOptions(field.options?.length ? [...field.options] : [""]);
    setAllowOther(Boolean(field.allow_other));
    setOtherLabel(field.other_label || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveField = async () => {
    if (!id || !label.trim()) {
      alert("Label wajib diisi");
      return;
    }

    try {
      setSavingField(true);
      const cleanOptions = options
        .map((o) => o.trim())
        .filter(Boolean);

      const payload: Partial<FormField> = {
        label,
        type,
        is_required: required,
        options:
          type === "select" || type === "checkbox" || type === "radio"
            ? cleanOptions
            : [],
        allow_other: allowOther,
        other_label: allowOther ? (otherLabel.trim() || "Other") : null,
      };

      if (editingFieldId) {
        await updateField(editingFieldId, payload);
      } else {
        await createField(id, {
          ...payload,
          name: generateFieldName(label),
          order: form?.fields?.length || 0,
        } as FormField);
      }

      resetFieldEditor();

      await fetchForm();
    } catch (error) {
      console.error(error);
      alert(
        editingFieldId
          ? "Gagal mengubah field"
          : "Gagal menambahkan field",
      );
    } finally {
      setSavingField(false);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm("Hapus field ini?")) return;

    try {
      await deleteField(fieldId);
      if (editingFieldId === fieldId) resetFieldEditor();
      await fetchForm();
    } catch (error) {
      console.error(error);
      alert("Gagal hapus field");
    }
  };

  useEffect(() => {
    fetchForm();
  }, [fetchForm, id, realtimeRevision]);

  if (loading) return <div className="p-6">Loading builder...</div>;
  if (!form) return <div className="p-6 text-red-500">Form not found</div>;

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {form.name}
        </h1>
        <p className="text-sm text-gray-500">Form Builder</p>
      </div>

      {/* CREATE / EDIT FIELD */}
      {(canCreateField || editingFieldId) && (
      <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {editingFieldId ? "Edit Field" : "Add Field"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {editingFieldId
              ? "Perbarui isi field lalu simpan perubahan."
              : "Tambahkan field baru ke form ini."}
          </p>
        </div>

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
              setType(e.target.value as FormField["type"]);
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
            <option value="radio">Radio</option>
            <option value="section">Section</option>
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
        {(type === "select" || type === "checkbox" || type === "radio") && (
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

        <div className="mt-4 flex flex-wrap gap-2">
          {editingFieldId && (
            <button
              type="button"
              onClick={resetFieldEditor}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <X size={16} />
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveField}
            disabled={savingField}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingField
              ? "Saving..."
              : editingFieldId
                ? "Update Field"
                : "Add Field"}
          </button>
        </div>
      </div>
      )}

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

                  <div className="flex items-center gap-2">
                    {canUpdateField && (
                      <button
                        type="button"
                        onClick={() => handleStartEditField(field)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-blue-600 transition hover:bg-blue-50"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                    )}
                    {canDeleteField && (
                      <button
                        type="button"
                        onClick={() => handleDeleteField(field.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}
                  </div>
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
