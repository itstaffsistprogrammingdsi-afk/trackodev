import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import api from "@/lib/axios";

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

  // =========================
  // FETCH
  // =========================
  const fetchForm = async () => {
    try {
      setLoading(true);

      const res = await api.get(`/public/forms/${slug}`);

      setForm(res.data);
    } catch (error) {
      console.error(error);

      alert("Form tidak ditemukan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForm();
  }, [slug]);

  // =========================
  // CHANGE
  // =========================
  const handleChange = (name: string, value: FormValue) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================
  // VALIDATE
  // =========================
  const validateForm = () => {
    if (!form) return false;

    for (const field of form.fields || []) {
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

      for (const key in values) {
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
        const file = fileValues[key];

        if (file) {
          formData.append(key, file);
        }
      }

      await api.post(`/public/forms/${slug}/submit`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

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
            Form tidak ditemukan
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Link form mungkin sudah tidak tersedia.
          </p>
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
              src={`http://localhost:8000/storage/${form.header_image}`}
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

            <h1 className="mt-3 text-3xl font-normal text-[#202124]">
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
            {form.fields?.map((field) => (
              <div
                key={field.id}
                className="rounded-2xl border border-[#dadce0] bg-white px-5 py-6 shadow-sm transition hover:shadow-md sm:px-6"
              >
                {/* LABEL */}
                <label className="mb-4 block">
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
                    type="number"
                    value={String(values[field.name] || "")}
                    onChange={(e) =>
                      handleChange(field.name, Number(e.target.value))
                    }
                    className="h-11 w-full border-0 border-b border-[#dadce0] bg-transparent px-0 text-sm outline-none transition focus:border-[#673ab7] focus:ring-0"
                    placeholder="Jawaban Anda"
                  />
                )}

                {/* DATE */}
                {field.type === "date" && (
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-0 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <DatePicker
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
                    {field.options?.map((option, index) => {
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
                            {option}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* SELECT */}
                {field.type === "select" && (
                  <div className="relative">
                    <select
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
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                )}
              </div>
            ))}

            {/* SUBMIT */}
            <div className="px-2 pt-2">
              <button
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
