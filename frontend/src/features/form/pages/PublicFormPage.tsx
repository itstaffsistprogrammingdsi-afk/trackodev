import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";

import api from "@/lib/axios";
import { resolveStorageUrl } from "@/lib/storageUrl";
import { toast } from "@/lib/feedback";

import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  FileText,
  Info,
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

/** Field status test case: select yang opsinya memuat PASS. */
function isStatusField(field: FormField): boolean {
  return field.type === "select" && (field.options ?? []).includes("PASS");
}

/** Field catatan/saran: textarea dengan akhiran `_note`. */
function isNoteField(field: FormField): boolean {
  return field.type === "textarea" && field.name.endsWith("_note");
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

  // Sebuah field mewarisi visibilitas section terdekat sebelumnya.
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

  const [error, setError] = useState<string | null>(null);

  const [highlightFieldId, setHighlightFieldId] = useState<string | null>(null);

  const draftStorageKey = slug ? `tracko:public-form-draft:${slug}` : null;

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

  const allFields = useMemo(() => form?.fields ?? [], [form]);

  const isFieldVisible = useCallback(
    (fieldId: string) => (form ? isPublicFieldVisible(form, fieldId, values) : false),
    [form, values],
  );

  /** Peta nama parent → field catatan (`<parent>_note`). */
  const noteFieldByParent = useMemo(() => {
    const map = new Map<string, FormField>();

    allFields.forEach((field) => {
      if (isNoteField(field)) {
        map.set(field.name.slice(0, -"_note".length), field);
      }
    });

    return map;
  }, [allFields]);

  const noteFieldIds = useMemo(
    () => new Set([...noteFieldByParent.values()].map((field) => field.id)),
    [noteFieldByParent],
  );

  const sectionFields = useMemo(
    () =>
      allFields.filter(
        (field) => field.type === "section" && isPublicFieldVisible(form!, field.id, values),
      ),
    [allFields, form, values],
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

  // Metadata tampil di section pertama, lalu satu section per layar.
  const fieldsForSection = (() => {
    if (sectionFields.length === 0) return allFields;
    if (activeSectionIndex < 0) return [];

    const firstSectionIndex = allFields.findIndex((field) => field.type === "section");
    const activeFieldIndex = allFields.findIndex(
      (field) => field.id === activeSectionId,
    );
    const nextSectionIndex = allFields.findIndex(
      (field, index) => index > activeFieldIndex && field.type === "section",
    );

    const metadata =
      activeSectionIndex === 0 ? allFields.slice(0, firstSectionIndex) : [];
    const currentSection = allFields.slice(
      activeFieldIndex,
      nextSectionIndex === -1 ? allFields.length : nextSectionIndex,
    );

    return [...metadata, ...currentSection];
  })();

  const isLastSection =
    sectionFields.length === 0 || activeSectionIndex === sectionFields.length - 1;

  const visibleFields = allFields.filter(
    (field) => field.type !== "section" && isFieldVisible(field.id),
  );

  const isAnswered = useCallback(
    (field: FormField) => {
      if (field.type === "file") return Boolean(fileValues[field.name]);

      const value = values[field.name];

      if (Array.isArray(value)) return value.length > 0;

      return value !== undefined && value !== null && String(value).trim() !== "";
    },
    [fileValues, values],
  );

  const answeredFields = visibleFields.filter(isAnswered).length;

  const completionPercent = visibleFields.length
    ? Math.round((answeredFields / visibleFields.length) * 100)
    : 0;

  /** Statistik per section: berapa field wajib/status yang sudah dijawab. */
  const sectionStats = useMemo(() => {
    const stats = new Map<string, { answered: number; total: number }>();

    sectionFields.forEach((section, index) => {
      const next = sectionFields[index + 1];
      const start = allFields.findIndex((field) => field.id === section.id);
      const end = next
        ? allFields.findIndex((field) => field.id === next.id)
        : allFields.length;

      const tracked = allFields
        .slice(start, end)
        .filter(
          (field) =>
            field.type !== "section" &&
            !isNoteField(field) &&
            isFieldVisible(field.id),
        );

      const answered = tracked.filter(isAnswered).length;

      stats.set(section.id, { answered, total: tracked.length });
    });

    return stats;
  }, [sectionFields, allFields, isFieldVisible, isAnswered]);

  const sectionForField = useCallback(
    (fieldId: string): FormField | null => {
      const index = allFields.findIndex((field) => field.id === fieldId);

      for (let cursor = index; cursor >= 0; cursor -= 1) {
        if (allFields[cursor].type === "section") return allFields[cursor];
      }

      return null;
    },
    [allFields],
  );

  /** Isi otomatis semua status yang belum dijawab pada section aktif dengan PASS. */
  const fillSectionWithPass = () => {
    const section = sectionFields[activeSectionIndex];
    if (!section) return;

    const start = allFields.findIndex((field) => field.id === section.id);
    const next = sectionFields[activeSectionIndex + 1];
    const end = next
      ? allFields.findIndex((field) => field.id === next.id)
      : allFields.length;

    const targets = allFields
      .slice(start, end)
      .filter((field) => isStatusField(field) && isFieldVisible(field.id));

    if (targets.length === 0) return;

    setValues((prev) => {
      const updated = { ...prev };

      targets.forEach((field) => {
        const current = updated[field.name];
        if (current === undefined || current === null || String(current).trim() === "") {
          updated[field.name] = "PASS";
        }
      });

      return updated;
    });

    toast.info(`Status kosong pada bagian ini diisi PASS.`);
  };

  // =========================
  // VALIDATE
  // =========================
  const firstInvalidField = (): FormField | null => {
    if (!form) return null;

    for (const field of form.fields || []) {
      if (field.type === "section") continue;
      if (!isFieldVisible(field.id)) continue;
      if (isNoteField(field)) continue; // ditangani lewat status pasangannya

      const value = values[field.name];

      if (field.type === "file" && field.is_required) {
        if (!fileValues[field.name]) return field;
      }

      if (field.type === "checkbox" && field.is_required) {
        if (!Array.isArray(value) || value.length === 0) return field;
      }

      if (
        field.type !== "file" &&
        field.type !== "checkbox" &&
        field.is_required &&
        (value === undefined || value === null || value === "")
      ) {
        return field;
      }

      if (
        field.allow_other &&
        (value === "__other__" ||
          (Array.isArray(value) && value.includes("__other__"))) &&
        !otherValues[field.name]
      ) {
        return field;
      }

      // Kotak saran wajib diisi bila status FAIL/BLOCKED.
      if (isStatusField(field)) {
        const status = String(value ?? "").toUpperCase();
        const note = noteFieldByParent.get(field.name);

        if (
          note &&
          (status === "FAIL" || status === "BLOCKED") &&
          isFieldVisible(note.id) &&
          !String(values[note.name] ?? "").trim()
        ) {
          return note;
        }
      }
    }

    return null;
  };

  /** Pindahkan layar ke field invalid lalu sorot. */
  const focusInvalidField = (field: FormField) => {
    const section = sectionForField(field.id);
    if (section) setActiveSectionId(section.id);
    setHighlightFieldId(field.id);
  };

  useEffect(() => {
    if (!highlightFieldId) return;

    const timer = window.setTimeout(() => {
      const element = document.getElementById(`field-${highlightFieldId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);

    const clear = window.setTimeout(() => setHighlightFieldId(null), 3000);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clear);
    };
  }, [highlightFieldId, activeSectionId]);

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async () => {
    if (!form) return;

    const invalid = firstInvalidField();

    if (invalid) {
      focusInvalidField(invalid);
      toast.error(`"${invalid.label}" wajib diisi.`);
      return;
    }

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

        toast.error(err.response?.data?.message || "Gagal submit form");
      } else {
        toast.error("Gagal submit form");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // RENDER INPUT
  // =========================
  const renderInput = (field: FormField) => {
    const highlightClass = highlightFieldId === field.id
      ? "rounded-lg ring-2 ring-rose-400 ring-offset-2"
      : "";

    // TEXT / EMAIL
    if (field.type === "text" || field.type === "email") {
      return (
        <input
          id={`field-${field.id}`}
          type={field.type === "email" ? "email" : "text"}
          autoComplete={field.type === "email" ? "email" : "off"}
          value={String(values[field.name] || "")}
          onChange={(e) => handleChange(field.name, e.target.value)}
          className={`h-11 w-full border-0 border-b border-[#dadce0] bg-transparent px-0 text-sm outline-none transition focus:border-[#673ab7] focus:ring-0 ${highlightClass}`}
          placeholder="Jawaban Anda"
        />
      );
    }

    // TEXTAREA (termasuk kotak saran)
    if (field.type === "textarea") {
      return (
        <textarea
          id={`field-${field.id}`}
          rows={isNoteField(field) ? 3 : 4}
          value={String(values[field.name] || "")}
          onChange={(e) => handleChange(field.name, e.target.value)}
          className={`w-full resize-none border-0 border-b border-[#dadce0] bg-transparent px-0 py-2 text-sm outline-none transition focus:border-[#673ab7] focus:ring-0 ${highlightClass}`}
          placeholder={isNoteField(field) ? "Tulis saran atau catatan di sini..." : "Jawaban Anda"}
        />
      );
    }

    // NUMBER
    if (field.type === "number") {
      return (
        <input
          id={`field-${field.id}`}
          type="number"
          value={String(values[field.name] || "")}
          onChange={(e) => {
            const rawValue = e.target.value;
            handleChange(field.name, rawValue === "" ? "" : Number(rawValue));
          }}
          className={`h-11 w-full border-0 border-b border-[#dadce0] bg-transparent px-0 text-sm outline-none transition focus:border-[#673ab7] focus:ring-0 ${highlightClass}`}
          placeholder="Jawaban Anda"
        />
      );
    }

    // DATE
    if (field.type === "date") {
      return (
        <div className={`relative ${highlightClass}`}>
          <Calendar className="pointer-events-none absolute left-0 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <DatePicker
            id={`field-${field.id}`}
            selected={
              values[field.name] ? new Date(String(values[field.name])) : null
            }
            onChange={(date: Date | null) => {
              if (!date) {
                handleChange(field.name, "");
                return;
              }

              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, "0");
              const day = String(date.getDate()).padStart(2, "0");

              handleChange(field.name, `${year}-${month}-${day}`);
            }}
            dateFormat="yyyy-MM-dd"
            placeholderText="Pilih tanggal"
            wrapperClassName="w-full"
            popperPlacement="bottom-start"
            showPopperArrow={false}
            className="h-11 w-full border-0 border-b border-[#dadce0] bg-transparent pl-7 text-sm outline-none transition focus:border-[#673ab7] focus:ring-0"
          />
        </div>
      );
    }

    // FILE
    if (field.type === "file") {
      return (
        <div className={`space-y-3 ${highlightClass}`}>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#dadce0] bg-slate-50 px-4 py-8 text-center transition hover:bg-slate-100">
            <Upload className="mb-2 h-6 w-6 text-slate-500" />

            <span className="text-sm font-medium text-slate-700">Upload file</span>

            <span className="mt-1 text-xs text-slate-500">Klik untuk memilih file</span>

            <input
              id={`field-${field.id}`}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setFileValues((prev) => ({ ...prev, [field.name]: file }));
              }}
            />
          </label>

          {fileValues[field.name] && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {fileValues[field.name]?.name}
            </div>
          )}
        </div>
      );
    }

    // CHECKBOX
    if (field.type === "checkbox") {
      return (
        <div className={`space-y-3 ${highlightClass}`}>
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
                      updatedValues = updatedValues.filter((item) => item !== option);
                    }

                    setValues((prev) => ({ ...prev, [field.name]: updatedValues }));
                  }}
                  className="mt-1 h-4 w-4"
                />

                <span className="text-sm text-slate-700">
                  {option === "__other__" ? field.other_label || "Lainnya" : option}
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
                  setOtherValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                }
                className="h-11 w-full border-0 border-b border-[#dadce0] bg-transparent px-0 text-sm outline-none focus:border-[#673ab7]"
                placeholder={`Isi ${field.other_label || "jawaban lainnya"}`}
              />
            )}
        </div>
      );
    }

    // RADIO
    if (field.type === "radio") {
      return (
        <div className={`space-y-3 ${highlightClass}`}>
          {[
            ...(field.options || []),
            ...(field.allow_other ? ["__other__"] : []),
          ].map((option, index) => (
            <label key={`${option}-${index}`} className="flex min-h-11 items-center gap-3">
              <input
                type="radio"
                name={field.name}
                value={option}
                checked={values[field.name] === option}
                onChange={() => handleChange(field.name, option)}
                className="h-5 w-5 shrink-0"
              />
              <span className="text-sm text-slate-700">
                {option === "__other__" ? field.other_label || "Lainnya" : option}
              </span>
            </label>
          ))}

          {values[field.name] === "__other__" && (
            <input
              type="text"
              value={otherValues[field.name] || ""}
              onChange={(e) =>
                setOtherValues((prev) => ({ ...prev, [field.name]: e.target.value }))
              }
              className="h-11 w-full border-0 border-b border-[#dadce0] bg-transparent px-0 text-sm outline-none focus:border-[#673ab7]"
              placeholder={`Isi ${field.other_label || "jawaban lainnya"}`}
            />
          )}
        </div>
      );
    }

    // SELECT
    if (field.type === "select") {
      return (
        <div className={`relative ${highlightClass}`}>
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
              <option value="__other__">{field.other_label || "Lainnya"}</option>
            )}
          </select>

          <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          {values[field.name] === "__other__" && (
            <input
              type="text"
              value={otherValues[field.name] || ""}
              onChange={(e) =>
                setOtherValues((prev) => ({ ...prev, [field.name]: e.target.value }))
              }
              className="mt-3 h-11 w-full border-0 border-b border-[#dadce0] bg-transparent px-0 text-sm outline-none focus:border-[#673ab7]"
              placeholder={`Isi ${field.other_label || "jawaban lainnya"}`}
            />
          )}
        </div>
      );
    }

    return null;
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
            <span className="text-sm">Memuat formulir...</span>
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

            <h2 className="text-xl font-semibold text-slate-900">Formulir tidak tersedia</h2>

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

  const renderFieldCard = (field: FormField) => {
    if (field.type === "section") {
      const note = noteFieldByParent.get(field.name);
      const showNote = note && isFieldVisible(note.id);
      const stats = sectionStats.get(field.id);

      return (
        <div
          key={field.id}
          className="rounded-2xl border border-[#d8c8f1] bg-[#f7f2fc] px-5 py-5 shadow-sm sm:px-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#673ab7]">
                Section pengujian
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[#3f2a5f]">{field.label}</h2>
              {field.description ? (
                <p className="mt-1 text-sm text-slate-600">{field.description}</p>
              ) : null}
            </div>

            {stats && stats.total > 0 ? (
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  stats.answered === stats.total
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                {stats.answered}/{stats.total} terisi
              </span>
            ) : null}
          </div>

          {stats && stats.total > 0 ? (
            <button
              type="button"
              onClick={fillSectionWithPass}
              className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d8c8f1] bg-white px-3 py-1.5 text-xs font-semibold text-[#5e35b1] transition hover:bg-[#efe7f9]"
            >
              <Check size={14} /> Tandai semua PASS (yang belum dijawab)
            </button>
          ) : null}

          {showNote && note ? (
            <div className="mt-4 rounded-xl border border-[#e3d6f5] bg-white px-4 py-3">
              <label htmlFor={`field-${note.id}`} className="text-xs font-semibold text-slate-600">
                {note.label}
              </label>
              <div className="mt-1">{renderInput(note)}</div>
            </div>
          ) : null}
        </div>
      );
    }

    const note = noteFieldByParent.get(field.name);
    const showNote = note && isFieldVisible(note.id);
    const isHighlighted = highlightFieldId === field.id || (note && highlightFieldId === note.id);

    return (
      <div
        key={field.id}
        className={`rounded-2xl border bg-white px-5 py-6 shadow-sm transition sm:px-6 ${
          isHighlighted ? "border-rose-300 ring-2 ring-rose-200" : "border-[#dadce0] hover:shadow-md"
        }`}
      >
        <label htmlFor={`field-${field.id}`} className="mb-2 block">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[15px] font-normal text-[#202124]">{field.label}</span>
            {field.is_required && <span className="text-red-500">*</span>}
          </div>
        </label>

        {field.description ? (
          <p className="mb-4 flex items-start gap-1.5 text-[13px] leading-5 text-slate-500">
            <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
            <span>{field.description}</span>
          </p>
        ) : (
          <div className="mb-4" />
        )}

        {renderInput(field)}

        {showNote && note ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <label htmlFor={`field-${note.id}`} className="text-xs font-semibold text-slate-600">
              {note.label}
            </label>
            {note.description ? (
              <p className="mt-0.5 text-[11px] text-slate-500">{note.description}</p>
            ) : null}
            <div className="mt-1">{renderInput(note)}</div>
          </div>
        ) : null}
      </div>
    );
  };

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
                  <h3 className="text-sm font-medium text-[#5f4339]">Informasi</h3>

                  <p className="mt-1 text-sm leading-6 text-[#5f4339]">{form.note_content}</p>
                </div>
              </div>
            </div>
          )}

          {submitted ? (
            <div
              className="mx-5 mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 sm:mx-8 sm:px-6"
              role="status"
            >
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
                <div
                  className="mx-5 mb-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:mx-8"
                  aria-label="Navigasi section UAT"
                >
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <span className="text-xs font-semibold text-slate-700">
                      Section {activeSectionIndex + 1} dari {sectionFields.length}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Anda dapat kembali ke section sebelumnya
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {sectionFields.map((section, index) => {
                      const stats = sectionStats.get(section.id);
                      const complete = stats && stats.total > 0 && stats.answered === stats.total;
                      const isActive = section.id === activeSectionId;

                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => setActiveSectionId(section.id)}
                          aria-current={isActive ? "step" : undefined}
                          className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                            isActive
                              ? "bg-[#673ab7] text-white shadow-sm"
                              : complete
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {complete && !isActive ? (
                            <Check size={13} className="shrink-0" />
                          ) : null}
                          <span>
                            {index + 1}. {section.label.replace(/^\w+\.\s*/, "")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mx-5 mb-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:mx-8">
                <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-600">
                  <span>
                    {answeredFields} dari {visibleFields.length} pertanyaan terisi
                  </span>
                  <span>{completionPercent}%</span>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
                  aria-hidden="true"
                >
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
                  .filter((field) => !noteFieldIds.has(field.id))
                  .map((field) => renderFieldCard(field))}

                {/* SUBMIT (sticky di bawah) */}
                <div className="sticky bottom-0 z-30 -mx-3 mt-2 flex flex-wrap items-center gap-3 border-t border-[#dadce0] bg-white/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4">
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

                  <div className="ml-auto text-[11px] text-slate-500">
                    {isLastSection
                      ? "Periksa kembali sebelum mengirim."
                      : "Jawaban tersimpan otomatis sebagai draft."}
                  </div>

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
