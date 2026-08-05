import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";

import api from "@/lib/axios";
import { resolveStorageUrl } from "@/lib/storageUrl";

import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

import {
  AlertCircle,
  Calendar,
  ChevronDown,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";

import type {
  Form,
  FormValue,
  FormValues,
  OtherValues,
  FileValues,
} from "../types";

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();

  const [form, setForm] = useState<Form | null>(null);

  const [values, setValues] = useState<FormValues>({});

  const [otherValues, setOtherValues] = useState<OtherValues>({});

  const [fileValues, setFileValues] = useState<FileValues>({});

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // =========================
  // FETCH
  // =========================
  const fetchForm = useCallback(async (signal?: AbortSignal) => {
    if (!slug) {
      setError("Tautan formulir tidak valid.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.get(`/public/forms/${slug}`, { signal });

      setForm(res.data);
    } catch (error) {
      if (signal?.aborted) return;

      console.error(error);
      setForm(null);
      setError("Formulir tidak dapat dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchForm(controller.signal);

    return () => controller.abort();
  }, [fetchForm]);

  // =========================
  // CHANGE
  // =========================
  const handleChange = (name: string, value: FormValue) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const isFieldVisible = (fieldId: string) => {
    const field = form?.fields?.find((item) => item.id === fieldId);

    if (!field?.depends_on_field_id) return true;

    const dependency = form?.fields?.find(
      (item) => item.id === field.depends_on_field_id,
    );

    if (!dependency) return true;

    const dependencyValue = values[dependency.name];
    const expectedValue = String(field.depends_on_value ?? "");

    return Array.isArray(dependencyValue)
      ? dependencyValue.map(String).includes(expectedValue)
      : String(dependencyValue ?? "") === expectedValue;
  };

  // =========================
  // VALIDATE
  // =========================
  const validateForm = () => {
    if (!form) return false;

    for (const field of form.fields || []) {
      if (!isFieldVisible(field.id)) continue;

      const value = values[field.name];

      if (field.type === "file" && field.is_required) {
        if (!fileValues[field.name]) {
          alert(`Field "${field.label}" wajib diisi`);

          return false;
        }
      }

      if (field.type === "checkbox" && field.is_required) {
        if (!Array.isArray(value) || value.length === 0) {
          alert(`Field "${field.label}" wajib diisi`);

          return false;
        }
      }

      if (
        field.type !== "file" &&
        field.type !== "checkbox" &&
        field.is_required
      ) {
        if (value === undefined || value === null || value === "") {
          alert(`Field "${field.label}" wajib diisi`);

          return false;
        }
      }

      if (
        field.allow_other &&
        (value === "__other__" ||
          (Array.isArray(value) && value.includes("__other__")))
      ) {
        if (!otherValues[field.name]) {
          alert(`Field "${field.label}" wajib diisi`);

          return false;
        }
      }
    }

    return true;
  };

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async () => {
    if (!form) return;

    const valid = validateForm();

    if (!valid) return;

    try {
      setSubmitting(true);

      const formData = new FormData();
      const visibleFieldNames = new Set(
        (form.fields || [])
          .filter((field) => isFieldVisible(field.id))
          .map((field) => field.name),
      );

      for (const key in values) {
        if (!visibleFieldNames.has(key)) continue;

        let value = values[key];

        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item === "__other__") {
              formData.append(`${key}[]`, otherValues[key] || "");
            } else {
              formData.append(`${key}[]`, item);
            }
          });

          continue;
        }

        if (value === "__other__") {
          value = otherValues[key] || "";
        }

        formData.append(key, String(value));
      }

      for (const key in fileValues) {
        if (!visibleFieldNames.has(key)) continue;

        const file = fileValues[key];

        if (file) {
          formData.append(key, file);
        }
      }

      await api.post(`/public/forms/${slug}/submit`, formData);

      alert("Form berhasil dikirim");

      setValues({});
      setOtherValues({});
      setFileValues({});
    } catch (error: unknown) {
      console.error(error);

      if (typeof error === "object" && error !== null && "response" in error) {
        const err = error as {
          response?: {
            data?: {
              message?: string;
            };
          };
        };

        alert(err.response?.data?.message || "Gagal submit form");
      } else {
        alert("Gagal submit form");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />

          <span className="text-sm">Loading form...</span>
        </div>
      </div>
    );
  }

  // =========================
  // NOT FOUND
  // =========================
  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />

          <h2 className="text-xl font-semibold text-slate-900">
            Formulir tidak tersedia
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error || "Tautan formulir mungkin sudah tidak tersedia."}
          </p>

          {error && (
            <button
              type="button"
              onClick={() => void fetchForm()}
              className="mt-5 min-h-11 rounded-lg bg-[#673ab7] px-5 py-2 text-sm font-medium text-white"
            >
              Coba lagi
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================
  // RENDER
  // =========================
  return (
    <div className="min-h-screen bg-[#f0ebf8] py-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl px-3 sm:px-4">
        {/* HEADER IMAGE */}
        <div className="overflow-hidden rounded-t-3xl border border-b-0 border-[#dadce0] bg-white shadow-sm">
          {form.header_image ? (
            <img
              src={resolveStorageUrl(form.header_image)}
              alt={form.name}
              className="max-h-[320px] w-full object-cover sm:max-h-[380px]"
            />
          ) : (
            <div className="h-24 w-full bg-[#673ab7]" />
          )}
        </div>

        {/* FORM CARD */}
        <div className="rounded-b-3xl border border-[#dadce0] bg-white shadow-sm">
          {/* TITLE */}
          <div className="border-t-[10px] border-[#673ab7] px-5 py-6 sm:px-8">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <FileText className="h-4 w-4" />
              Public Form
            </div>

            <h1 className="mt-3 break-words text-2xl font-normal text-[#202124] sm:text-3xl">
              {form.name}
            </h1>

            {form.description && (
              <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-slate-600">
                {form.description}
              </p>
            )}
          </div>

          {/* NOTE */}
          {form.show_note && form.note_content && (
            <div className="mx-5 mb-2 rounded-2xl border border-[#f6c26b] bg-[#fef7e0] px-4 py-4 sm:mx-8">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#e37400]" />

                <div>
                  <h3 className="text-sm font-medium text-[#5f4339]">
                    Informasi
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-[#5f4339]">
                    {form.note_content}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FIELDS */}
          <div className="space-y-4 px-3 pb-6 pt-2 sm:px-4 sm:pb-8">
            {form.fields
              ?.filter((field) => isFieldVisible(field.id))
              .map((field) => (
              <div
                key={field.id}
                className="rounded-2xl border border-[#dadce0] bg-white px-5 py-6 shadow-sm transition hover:shadow-md sm:px-6"
              >
                {/* LABEL */}
                <label htmlFor={`field-${field.id}`} className="mb-4 block">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[15px] font-normal text-[#202124]">
                      {field.label}
                    </span>

                    {field.is_required && (
                      <span className="text-red-500">*</span>
                    )}
                  </div>
                </label>

                {/* TEXT */}
                {field.type === "text" && (
                  <input
                    id={`field-${field.id}`}
                    type="text"
                    value={String(values[field.name] || "")}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="h-11 w-full border-0 border-b border-[#dadce0] bg-transparent px-0 text-sm outline-none transition focus:border-[#673ab7] focus:ring-0"
                    placeholder="Jawaban Anda"
                  />
                )}

                {/* TEXTAREA */}
                {field.type === "textarea" && (
                  <textarea
                    id={`field-${field.id}`}
                    rows={4}
                    value={String(values[field.name] || "")}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-full resize-none border-0 border-b border-[#dadce0] bg-transparent px-0 py-2 text-sm outline-none transition focus:border-[#673ab7] focus:ring-0"
                    placeholder="Jawaban Anda"
                  />
                )}

                {/* NUMBER */}
                {field.type === "number" && (
                  <input
                    id={`field-${field.id}`}
                    type="number"
                    value={String(values[field.name] || "")}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      handleChange(
                        field.name,
                        rawValue === "" ? "" : Number(rawValue),
                      );
                    }}
                    className="h-11 w-full border-0 border-b border-[#dadce0] bg-transparent px-0 text-sm outline-none transition focus:border-[#673ab7] focus:ring-0"
                    placeholder="Jawaban Anda"
                  />
                )}

                {/* DATE */}
                {field.type === "date" && (
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-0 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <DatePicker
                      id={`field-${field.id}`}
                      selected={
                        values[field.name]
                          ? new Date(String(values[field.name]))
                          : null
                      }
                      onChange={(date: Date | null) => {
                        if (!date) {
                          handleChange(field.name, "");

                          return;
                        }

                        const year = date.getFullYear();

                        const month = String(date.getMonth() + 1).padStart(
                          2,
                          "0",
                        );

                        const day = String(date.getDate()).padStart(2, "0");

                        const formatted = `${year}-${month}-${day}`;

                        handleChange(field.name, formatted);
                      }}
                      dateFormat="yyyy-MM-dd"
                      placeholderText="Pilih tanggal"
                      wrapperClassName="w-full"
                      popperPlacement="bottom-start"
                      showPopperArrow={false}
                      className="h-11 w-full border-0 border-b border-[#dadce0] bg-transparent pl-7 text-sm outline-none transition focus:border-[#673ab7] focus:ring-0"
                    />
                  </div>
                )}

                {/* FILE */}
                {field.type === "file" && (
                  <div className="space-y-3">
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#dadce0] bg-slate-50 px-4 py-8 text-center transition hover:bg-slate-100">
                      <Upload className="mb-2 h-6 w-6 text-slate-500" />

                      <span className="text-sm font-medium text-slate-700">
                        Upload file
                      </span>

                      <span className="mt-1 text-xs text-slate-500">
                        Klik untuk memilih file
                      </span>

                      <input
                        id={`field-${field.id}`}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;

                          setFileValues((prev) => ({
                            ...prev,
                            [field.name]: file,
                          }));
                        }}
                      />
                    </label>

                    {fileValues[field.name] && (
                      <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {fileValues[field.name]?.name}
                      </div>
                    )}
                  </div>
                )}

                {/* CHECKBOX */}
                {field.type === "checkbox" && (
                  <div className="space-y-3">
                    {[
                      ...(field.options || []),
                      ...(field.allow_other ? ["__other__"] : []),
                    ].map((option, index) => {
                      const currentValues = Array.isArray(values[field.name])
                        ? (values[field.name] as string[])
                        : [];

                      const checked = currentValues.includes(option);

                      return (
                        <label key={index} className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              let updatedValues = [...currentValues];

                              if (e.target.checked) {
                                updatedValues.push(option);
                              } else {
                                updatedValues = updatedValues.filter(
                                  (item) => item !== option,
                                );
                              }

                              setValues((prev) => ({
                                ...prev,
                                [field.name]: updatedValues,
                              }));
                            }}
                            className="mt-1 h-4 w-4"
                          />

                          <span className="text-sm text-slate-700">
                            {option === "__other__"
                              ? field.other_label || "Lainnya"
                              : option}
                          </span>
                        </label>
                      );
                    })}

                    {Array.isArray(values[field.name]) &&
                      (values[field.name] as string[]).includes("__other__") && (
                        <input
                          type="text"
                          value={otherValues[field.name] || ""}
                          onChange={(e) =>
                            setOtherValues((prev) => ({
                              ...prev,
                              [field.name]: e.target.value,
                            }))
                          }
                          className="h-11 w-full border-0 border-b border-[#dadce0] bg-transparent px-0 text-sm outline-none focus:border-[#673ab7]"
                          placeholder={`Isi ${field.other_label || "jawaban lainnya"}`}
                        />
                      )}
                  </div>
                )}

                {/* RADIO */}
                {field.type === "radio" && (
                  <div className="space-y-3">
                    {[
                      ...(field.options || []),
                      ...(field.allow_other ? ["__other__"] : []),
                    ].map((option, index) => (
                      <label
                        key={`${option}-${index}`}
                        className="flex min-h-11 items-center gap-3"
                      >
                        <input
                          type="radio"
                          name={field.name}
                          value={option}
                          checked={values[field.name] === option}
                          onChange={() => handleChange(field.name, option)}
                          className="h-5 w-5 shrink-0"
                        />
                        <span className="text-sm text-slate-700">
                          {option === "__other__"
                            ? field.other_label || "Lainnya"
                            : option}
                        </span>
                      </label>
                    ))}

                    {values[field.name] === "__other__" && (
                      <input
                        type="text"
                        value={otherValues[field.name] || ""}
                        onChange={(e) =>
                          setOtherValues((prev) => ({
                            ...prev,
                            [field.name]: e.target.value,
                          }))
                        }
                        className="h-11 w-full border-0 border-b border-[#dadce0] bg-transparent px-0 text-sm outline-none focus:border-[#673ab7]"
                        placeholder={`Isi ${field.other_label || "jawaban lainnya"}`}
                      />
                    )}
                  </div>
                )}

                {/* SELECT */}
                {field.type === "select" && (
                  <div className="relative">
                    <select
                      id={`field-${field.id}`}
                      value={String(values[field.name] || "")}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className="h-11 w-full appearance-none border-0 border-b border-[#dadce0] bg-transparent px-0 pr-8 text-sm outline-none transition focus:border-[#673ab7] focus:ring-0"
                    >
                      <option value="">Pilih opsi</option>

                      {field.options?.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}

                      {field.allow_other && (
                        <option value="__other__">
                          {field.other_label || "Lainnya"}
                        </option>
                      )}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    {values[field.name] === "__other__" && (
                      <input
                        type="text"
                        value={otherValues[field.name] || ""}
                        onChange={(e) =>
                          setOtherValues((prev) => ({
                            ...prev,
                            [field.name]: e.target.value,
                          }))
                        }
                        className="mt-3 h-11 w-full border-0 border-b border-[#dadce0] bg-transparent px-0 text-sm outline-none focus:border-[#673ab7]"
                        placeholder={`Isi ${field.other_label || "jawaban lainnya"}`}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* SUBMIT */}
            <div className="px-2 pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex h-11 items-center justify-center rounded-lg bg-[#673ab7] px-6 text-sm font-medium text-white transition hover:bg-[#5e35b1] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}

                {submitting ? "Mengirim..." : "Kirim"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
