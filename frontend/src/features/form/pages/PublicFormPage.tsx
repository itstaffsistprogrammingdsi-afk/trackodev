import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";

import api from "@/lib/axios";
import { resolveStorageUrl } from "@/lib/storageUrl";

import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  ChevronDown,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";

import type {
  Form,
  FormField,
  FormValue,
  FormValues,
  OtherValues,
  FileValues,
} from "../types";

function PublicFormTopBar() {
  return (
    <nav
      aria-label="Navigasi formulir publik"
      className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-3xl px-3 sm:px-4">
        <Link
          to="/landing"
          className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-[#673ab7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#673ab7] focus-visible:ring-offset-2"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5 shrink-0" />
          <span>Kembali ke landing page</span>
        </Link>
      </div>
    </nav>
  );
}

function matchesFieldDependency(
  form: Form,
  field: FormField,
  values: FormValues,
) {
  if (!field.depends_on_field_id) return true;

  const dependency = form.fields?.find(
    (item) => item.id === field.depends_on_field_id,
  );

  if (!dependency) return false;

  const dependencyValue = values[dependency.name];
  const expectedValue = String(field.depends_on_value ?? "");

  return Array.isArray(dependencyValue)
    ? dependencyValue.map(String).includes(expectedValue)
    : String(dependencyValue ?? "") === expectedValue;
}

function isPublicFieldVisible(
  form: Form,
  fieldId: string,
  values: FormValues,
) {
  const fields = form.fields ?? [];
  const field = fields.find((item) => item.id === fieldId);

  if (!field) return false;

  // A test case inherits the visibility of its nearest section. This keeps
  // role/platform/module filtering consistent for every field in that block.
  if (field.type !== "section") {
    const fieldIndex = fields.findIndex((item) => item.id === fieldId);

    for (let index = fieldIndex - 1; index >= 0; index -= 1) {
      const section = fields[index];

      if (section.type === "section") {
        if (!matchesFieldDependency(form, section, values)) return false;
        break;
      }
    }
  }

  return matchesFieldDependency(form, field, values);
}

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();

  const [form, setForm] = useState<Form | null>(null);

  const [values, setValues] = useState<FormValues>({});

  const [otherValues, setOtherValues] = useState<OtherValues>({});

  const [fileValues, setFileValues] = useState<FileValues>({});

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [submitted, setSubmitted] = useState(false);

  const [activeSectionId, setActiveSectionId] = useState("");

  const [draftReady, setDraftReady] = useState(false);

  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);

  const draftStorageKey = slug
    ? `tracko:public-form-draft:${slug}`
    : null;

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

      const firstSection = res.data?.fields?.find(
        (field: FormField) => field.type === "section",
      );

      let savedDraft: {
        values?: FormValues;
        otherValues?: OtherValues;
        activeSectionId?: string;
        savedAt?: string;
      } | null = null;

      if (draftStorageKey) {
        try {
          const rawDraft = window.localStorage.getItem(draftStorageKey);
          if (rawDraft) savedDraft = JSON.parse(rawDraft);
        } catch (draftError) {
          console.warn("Draft public form tidak dapat dipulihkan", draftError);
        }
      }

      if (savedDraft?.values) setValues(savedDraft.values);
      if (savedDraft?.otherValues) setOtherValues(savedDraft.otherValues);

      const savedSection = res.data?.fields?.find(
        (field: FormField) => field.id === savedDraft?.activeSectionId,
      );

      setActiveSectionId(savedSection?.id ?? firstSection?.id ?? "");
      setDraftSavedAt(savedDraft?.savedAt ? new Date(savedDraft.savedAt) : null);
      setDraftReady(true);
    } catch (error) {
      if (signal?.aborted) return;

      console.error(error);
      setForm(null);
      setDraftReady(false);
      setError("Formulir tidak dapat dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [draftStorageKey, slug]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchForm(controller.signal);

    return () => controller.abort();
  }, [fetchForm]);

  useEffect(() => {
    if (!form || !draftStorageKey || !draftReady || submitted) return;

    const timer = window.setTimeout(() => {
      try {
        const savedAt = new Date();

        window.localStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            values,
            otherValues,
            activeSectionId,
            savedAt: savedAt.toISOString(),
          }),
        );

        setDraftSavedAt(savedAt);
      } catch (draftError) {
        console.warn("Draft public form tidak dapat disimpan", draftError);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    activeSectionId,
    draftReady,
    draftStorageKey,
    form,
    otherValues,
    submitted,
    values,
  ]);

  // =========================
  // CHANGE
  // =========================
  const handleChange = (name: string, value: FormValue) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const isFieldVisible = (fieldId: string) =>
    form ? isPublicFieldVisible(form, fieldId, values) : false;

  const sectionFields = useMemo(
    () => form?.fields?.filter(
      (field) => field.type === "section" && isPublicFieldVisible(form, field.id, values),
    ) ?? [],
    [form, values],
  );
  const activeSectionIndex = sectionFields.findIndex(
    (field) => field.id === activeSectionId,
  );

  useEffect(() => {
    if (!sectionFields.length) {
      if (activeSectionId) setActiveSectionId("");
      return;
    }

    if (activeSectionIndex < 0) {
      setActiveSectionId(sectionFields[0].id);
    }
  }, [activeSectionId, activeSectionIndex, sectionFields]);

  // Tampilkan metadata sekali di section pertama, lalu satu section test case
  // per layar. Field quality/sign-off setelah section terakhir ikut tampil di
  // section terakhir agar tombol submit tidak tersebar di banyak tempat.
  const fieldsForSection = (() => {
    const allFields = form?.fields ?? [];

    if (sectionFields.length === 0) return allFields;
    if (activeSectionIndex < 0) return [];

    const firstSectionIndex = allFields.findIndex((field) => field.type === "section");
    const activeFieldIndex = allFields.findIndex(
      (field) => field.id === activeSectionId,
    );
    const nextSectionIndex = allFields.findIndex(
      (field, index) => index > activeFieldIndex && field.type === "section",
    );

    const metadata = activeSectionIndex === 0
      ? allFields.slice(0, firstSectionIndex)
      : [];
    const currentSection = allFields.slice(
      activeFieldIndex,
      nextSectionIndex === -1 ? allFields.length : nextSectionIndex,
    );

    return [...metadata, ...currentSection];
  })();

  const isLastSection =
    sectionFields.length === 0 || activeSectionIndex === sectionFields.length - 1;

  const visibleFields = form?.fields?.filter(
    (field) => field.type !== "section" && isFieldVisible(field.id),
  ) ?? [];

  const answeredFields = visibleFields.filter((field) => {
    if (field.type === "file") return Boolean(fileValues[field.name]);

    const value = values[field.name];

    if (Array.isArray(value)) return value.length > 0;

    return value !== undefined && value !== null && String(value).trim() !== "";
  }).length;

  const completionPercent = visibleFields.length
    ? Math.round((answeredFields / visibleFields.length) * 100)
    : 0;

  // =========================
  // VALIDATE
  // =========================
  const validateForm = () => {
    if (!form) return false;

    for (const field of form.fields || []) {
      if (field.type === "section") continue;

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
          .filter((field) => field.type !== "section" && isFieldVisible(field.id))
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

      setSubmitted(true);

      setValues({});
      setOtherValues({});
      setFileValues({});
      setDraftSavedAt(null);

      if (draftStorageKey) {
        window.localStorage.removeItem(draftStorageKey);
      }

      const firstSection = form.fields?.find(
        (field) => field.type === "section",
      );
      setActiveSectionId(firstSection?.id ?? "");
      window.scrollTo({ top: 0, behavior: "smooth" });
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
      <div className="min-h-screen bg-slate-50">
        <PublicFormTopBar />
        <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-4">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />

            <span className="text-sm">Loading form...</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // NOT FOUND
  // =========================
  if (!form) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicFormTopBar />
        <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-4 py-8">
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
      </div>
    );
  }

  // =========================
  // RENDER
  // =========================
  return (
    <div className="min-h-screen bg-[#f0ebf8]">
      <PublicFormTopBar />
      <div className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4 sm:py-10">
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

          {submitted ? (
            <div className="mx-5 mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 sm:mx-8 sm:px-6" role="status">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg text-white">
                  ✓
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-emerald-900">
                    Jawaban berhasil dikirim
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    Terima kasih. Tim Tracko akan meninjau hasil UAT Anda.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-4 min-h-11 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                  >
                    Isi jawaban lain
                  </button>
                </div>
              </div>
            </div>
          ) : (
          <>
          {sectionFields.length > 0 && (
            <div className="mx-5 mb-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:mx-8" aria-label="Navigasi section UAT">
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <span className="text-xs font-semibold text-slate-700">
                  Section {activeSectionIndex + 1} dari {sectionFields.length}
                </span>
                <span className="text-[11px] text-slate-500">
                  Anda dapat kembali ke section sebelumnya
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {sectionFields.map((section, index) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                    aria-current={section.id === activeSectionId ? "step" : undefined}
                    className={`min-h-10 shrink-0 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                      section.id === activeSectionId
                        ? "bg-[#673ab7] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {index + 1}. {section.label.replace(/^\w+\.\s*/, "")}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mx-5 mb-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:mx-8">
            <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-600">
              <span>{answeredFields} dari {visibleFields.length} pertanyaan terisi</span>
              <span>{completionPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
              <div
                className="h-full rounded-full bg-[#673ab7] transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {draftSavedAt
                ? "Draft tersimpan otomatis di perangkat ini. Lampiran perlu dipilih ulang bila halaman ditutup."
                : "Jawaban teks tersimpan otomatis sebagai draft di perangkat ini."}
            </p>
          </div>

          {/* FIELDS */}
          <div className="space-y-4 px-3 pb-6 pt-2 sm:px-4 sm:pb-8">
            {fieldsForSection
              .filter((field) => isFieldVisible(field.id))
              .map((field) => (
              <div
                key={field.id}
                className={field.type === "section"
                  ? "rounded-2xl border border-[#d8c8f1] bg-[#f7f2fc] px-5 py-5 shadow-sm sm:px-6"
                  : "rounded-2xl border border-[#dadce0] bg-white px-5 py-6 shadow-sm transition hover:shadow-md sm:px-6"}
              >
                {field.type === "section" ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#673ab7]">
                      Section pengujian
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-[#3f2a5f]">
                      {field.label}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Pilih status untuk setiap test case di bagian ini.
                    </p>
                  </>
                ) : (
                <>
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
                </>
                )}
              </div>
            ))}

            {/* SUBMIT */}
            <div className="flex flex-wrap items-center gap-3 px-2 pt-2">
              {sectionFields.length > 0 && activeSectionIndex > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const previousSection = sectionFields[activeSectionIndex - 1];
                    if (previousSection) setActiveSectionId(previousSection.id);
                  }}
                  className="flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Section sebelumnya
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!isLastSection) {
                    const nextSection = sectionFields[activeSectionIndex + 1];
                    if (nextSection) setActiveSectionId(nextSection.id);
                    return;
                  }

                  void handleSubmit();
                }}
                disabled={submitting}
                className="flex h-11 items-center justify-center rounded-lg bg-[#673ab7] px-6 text-sm font-medium text-white transition hover:bg-[#5e35b1] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLastSection && submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}

                {isLastSection
                  ? submitting
                    ? "Mengirim..."
                    : "Kirim UAT"
                  : "Lanjut ke section berikutnya"}
              </button>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
