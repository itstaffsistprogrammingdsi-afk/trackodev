import { 
  // useEffect, 
  useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  createForm,
  createField,
  deleteField,
} from "../api/form.api";

import type { FormField } from "../types";

// ======================================================
// TYPES
// ======================================================

type CreatedForm = {
  id: string;
  name: string;
  description?: string;
};

type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "file"
  | "select"
  | "checkbox";

// ======================================================
// PAGE
// ======================================================

export default function CreateFormBuilderPage() {
  const navigate = useNavigate();

  // ======================================================
  // FORM STATE
  // ======================================================

  const [loadingForm, setLoadingForm] = useState(false);

  const [createdForm, setCreatedForm] =
    useState<CreatedForm | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
    show_note: false,
    note_content: "",
  });

  const [headerImage, setHeaderImage] =
    useState<File | null>(null);

  // ======================================================
  // FIELD STATE
  // ======================================================

  const [savingField, setSavingField] =
    useState(false);

  const [fields, setFields] = useState<FormField[]>([]);

  const [label, setLabel] = useState("");
  const [type, setType] =
    useState<FieldType>("text");

  const [required, setRequired] =
    useState(false);

  const [options, setOptions] = useState<string[]>([
    "",
  ]);

  const [allowOther, setAllowOther] =
    useState(false);

  const [otherLabel, setOtherLabel] =
    useState("");

  // ======================================================
  // HELPERS
  // ======================================================

  const isOptionType = useMemo(() => {
    return type === "select" || type === "checkbox";
  }, [type]);

  const generateFieldName = (
    text: string,
  ) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w]/g, "");
  };

  const resetFieldForm = () => {
    setLabel("");
    setType("text");
    setRequired(false);
    setOptions([""]);
    setAllowOther(false);
    setOtherLabel("");
  };

  // ======================================================
  // CREATE FORM
  // ======================================================

  const handleCreateForm = async () => {
    if (!formData.name.trim()) {
      alert("Form name wajib diisi");
      return;
    }

    try {
      setLoadingForm(true);

      const payload = new FormData();

      payload.append("name", formData.name);
      payload.append(
        "description",
        formData.description,
      );

      payload.append(
        "is_active",
        formData.is_active ? "1" : "0",
      );

      payload.append(
        "show_note",
        formData.show_note ? "1" : "0",
      );

      payload.append(
        "note_content",
        formData.note_content,
      );

      if (headerImage) {
        payload.append(
          "header_image",
          headerImage,
        );
      }

      const response = await createForm(payload);

      setCreatedForm(response);

      alert(
        "Form berhasil dibuat. Sekarang tambahkan field.",
      );
    } catch (error) {
      console.error(error);

      alert("Gagal membuat form");
    } finally {
      setLoadingForm(false);
    }
  };

  // ======================================================
  // ADD FIELD
  // ======================================================

  const handleAddField = async () => {
    if (!createdForm?.id) return;

    if (!label.trim()) {
      alert("Label field wajib diisi");
      return;
    }

    try {
      setSavingField(true);

      const cleanOptions = options
        .map((o) => o.trim())
        .filter(Boolean);

      const payload: Partial<FormField> = {
        label,
        name: generateFieldName(label),
        type,
        is_required: required,
        order: fields.length,

        options: isOptionType
          ? cleanOptions
          : [],

        allow_other: allowOther,

        other_label: allowOther
          ? otherLabel || "Other"
          : null,
      };

      const newField = await createField(
        createdForm.id,
        payload as FormField,
      );

      setFields((prev) => [...prev, newField]);

      resetFieldForm();
    } catch (error) {
      console.error(error);

      alert("Gagal menambahkan field");
    } finally {
      setSavingField(false);
    }
  };

  // ======================================================
  // DELETE FIELD
  // ======================================================

  const handleDeleteField = async (
    fieldId: string,
  ) => {
    const confirmed = confirm(
      "Hapus field ini?",
    );

    if (!confirmed) return;

    try {
      await deleteField(fieldId);

      setFields((prev) =>
        prev.filter((f) => f.id !== fieldId),
      );
    } catch (error) {
      console.error(error);

      alert("Gagal menghapus field");
    }
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
        {/* ================================================= */}
        {/* PAGE HEADER */}
        {/* ================================================= */}

        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Form Builder
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Create dynamic forms with custom
              fields.
            </p>
          </div>

          <button
            onClick={() => navigate("/forms")}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Back
          </button>
        </div>

        {/* ================================================= */}
        {/* FORM SETUP */}
        {/* ================================================= */}

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Form Information
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Configure the main form settings.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* FORM NAME */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Form Name
              </label>

              <input
                type="text"
                value={formData.name}
                disabled={!!createdForm}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                  })
                }
                placeholder="Example: Employee Evaluation Form"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              />
            </div>

            {/* DESCRIPTION */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Description
              </label>

              <textarea
                rows={4}
                disabled={!!createdForm}
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                placeholder="Write form description..."
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              />
            </div>

            {/* HEADER IMAGE */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Header Image
              </label>

              <input
                type="file"
                disabled={!!createdForm}
                onChange={(e) =>
                  setHeaderImage(
                    e.target.files?.[0] || null,
                  )
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
              />
            </div>

            {/* ACTIVE */}
            <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-4">
              <input
                type="checkbox"
                checked={formData.is_active}
                disabled={!!createdForm}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_active: e.target.checked,
                  })
                }
              />

              <div>
                <div className="text-sm font-medium text-gray-800">
                  Active Form
                </div>

                <div className="text-xs text-gray-500">
                  Form can receive submissions
                </div>
              </div>
            </label>

            {/* NOTE */}
            <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-4">
              <input
                type="checkbox"
                checked={formData.show_note}
                disabled={!!createdForm}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    show_note: e.target.checked,
                  })
                }
              />

              <div>
                <div className="text-sm font-medium text-gray-800">
                  Show Note
                </div>

                <div className="text-xs text-gray-500">
                  Display note section
                </div>
              </div>
            </label>

            {/* NOTE CONTENT */}
            {formData.show_note && (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Note Content
                </label>

                <textarea
                  rows={3}
                  disabled={!!createdForm}
                  value={formData.note_content}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      note_content:
                        e.target.value,
                    })
                  }
                  placeholder="Write note..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* ACTION */}
          {!createdForm && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCreateForm}
                disabled={loadingForm}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingForm
                  ? "Creating..."
                  : "Create Form"}
              </button>
            </div>
          )}
        </div>

        {/* ================================================= */}
        {/* BUILDER */}
        {/* ================================================= */}

        {createdForm && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* ============================================= */}
            {/* LEFT PANEL */}
            {/* ============================================= */}

            <div className="lg:col-span-1">
              <div className="sticky top-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Add Field
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Configure a new form field.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* LABEL */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Label
                    </label>

                    <input
                      value={label}
                      onChange={(e) =>
                        setLabel(
                          e.target.value,
                        )
                      }
                      placeholder="Example: Full Name"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    />
                  </div>

                  {/* TYPE */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Field Type
                    </label>

                    <select
                      value={type}
                      onChange={(e) => {
                        setType(
                          e.target
                            .value as FieldType,
                        );

                        setOptions([""]);
                        setAllowOther(false);
                        setOtherLabel("");
                      }}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    >
                      <option value="text">
                        Text
                      </option>

                      <option value="textarea">
                        Textarea
                      </option>

                      <option value="number">
                        Number
                      </option>

                      <option value="date">
                        Date
                      </option>

                      <option value="file">
                        File Upload
                      </option>

                      <option value="select">
                        Select
                      </option>

                      <option value="checkbox">
                        Checkbox
                      </option>
                    </select>
                  </div>

                  {/* REQUIRED */}
                  <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-4">
                    <input
                      type="checkbox"
                      checked={required}
                      onChange={(e) =>
                        setRequired(
                          e.target.checked,
                        )
                      }
                    />

                    <span className="text-sm font-medium text-gray-700">
                      Required Field
                    </span>
                  </label>

                  {/* OPTIONS */}
                  {isOptionType && (
                    <div className="rounded-xl border border-gray-200 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-800">
                          Options
                        </h3>

                        <button
                          type="button"
                          onClick={() =>
                            setOptions([
                              ...options,
                              "",
                            ])
                          }
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          + Add
                        </button>
                      </div>

                      <div className="space-y-2">
                        {options.map(
                          (option, index) => (
                            <div
                              key={index}
                              className="flex gap-2"
                            >
                              <input
                                value={option}
                                onChange={(e) => {
                                  const updated =
                                    [
                                      ...options,
                                    ];

                                  updated[index] =
                                    e.target.value;

                                  setOptions(
                                    updated,
                                  );
                                }}
                                placeholder={`Option ${
                                  index + 1
                                }`}
                                className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                              />

                              <button
                                type="button"
                                onClick={() => {
                                  const updated =
                                    options.filter(
                                      (
                                        _,
                                        i,
                                      ) =>
                                        i !==
                                        index,
                                    );

                                  setOptions(
                                    updated.length
                                      ? updated
                                      : [""],
                                  );
                                }}
                                className="rounded-xl border border-red-200 px-3 text-red-600 transition hover:bg-red-50"
                              >
                                ✕
                              </button>
                            </div>
                          ),
                        )}
                      </div>

                      {/* OTHER */}
                      <div className="mt-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={
                              allowOther
                            }
                            onChange={(e) =>
                              setAllowOther(
                                e.target
                                  .checked,
                              )
                            }
                          />

                          <span className="text-sm text-gray-700">
                            Allow Other
                          </span>
                        </label>

                        {allowOther && (
                          <input
                            value={otherLabel}
                            onChange={(e) =>
                              setOtherLabel(
                                e.target
                                  .value,
                              )
                            }
                            placeholder="Other label"
                            className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* BUTTON */}
                  <button
                    onClick={handleAddField}
                    disabled={savingField}
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingField
                      ? "Saving..."
                      : "Add Field"}
                  </button>
                </div>
              </div>
            </div>

            {/* ============================================= */}
            {/* RIGHT PANEL */}
            {/* ============================================= */}

            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Form Fields
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Total fields: {fields.length}
                    </p>
                  </div>
                </div>

                {!fields.length ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
                    <div className="text-lg font-medium text-gray-700">
                      No fields yet
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      Add your first field from the
                      left panel.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className="rounded-2xl border border-gray-200 p-5 transition hover:border-blue-300"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-gray-900">
                                {field.label}
                              </h3>

                              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                                {field.type}
                              </span>

                              {field.is_required && (
                                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
                                  Required
                                </span>
                              )}
                            </div>

                            {/* OPTIONS */}
                            {!!field.options
                              ?.length && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {field.options.map(
                                  (
                                    option,
                                    index,
                                  ) => (
                                    <span
                                      key={
                                        index
                                      }
                                      className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                                    >
                                      {option}
                                    </span>
                                  ),
                                )}

                                {field.allow_other && (
                                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                    {field.other_label ||
                                      "Other"}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* ACTION */}
                          <button
                            onClick={() =>
                              handleDeleteField(
                                field.id,
                              )
                            }
                            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* FOOTER */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() =>
                      navigate("/forms")
                    }
                    className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
                  >
                    Finish
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}