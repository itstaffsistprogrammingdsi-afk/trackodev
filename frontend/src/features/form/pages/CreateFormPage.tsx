import { 
  // useEffect, 
  useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  CircleDot,
  Copy,
  Eye,
  Hash,
  Heading,
  List,
  Palette,
  Pencil,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";

import { toast, confirmDialog } from "@/lib/feedback";

import {
  createForm,
  createField,
  updateField,
  deleteField,
  updateForm,
} from "../api/form.api";

import type { FormField } from "../types";
import { FORM_THEMES, readableTextColor } from "../utils/theme";
import RequiredToggle from "../components/RequiredToggle";

// ======================================================
// TYPES
// ======================================================

type CreatedForm = {
  id: string;
  name: string;
  description?: string;
  theme_color?: string | null;
};

type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "file"
  | "select"
  | "checkbox"
  | "radio"
  | "section";

const FIELD_TYPES: Array<{
  value: FieldType;
  label: string;
  icon: typeof Type;
}> = [
  { value: "text", label: "Teks singkat", icon: Type },
  { value: "textarea", label: "Paragraf", icon: AlignLeft },
  { value: "number", label: "Angka", icon: Hash },
  { value: "date", label: "Tanggal", icon: Calendar },
  { value: "file", label: "Upload file", icon: Upload },
  { value: "select", label: "Dropdown", icon: List },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "radio", label: "Pilihan ganda", icon: CircleDot },
  { value: "section", label: "Section", icon: Heading },
];

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

  const [themeColor, setThemeColor] = useState("#3f51f5");
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");
  const fieldEditorRef = useRef<HTMLDivElement>(null);
  const builderRef = useRef<HTMLDivElement>(null);

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
  const [fieldDescription, setFieldDescription] = useState("");

  const [required, setWajib] =
    useState(false);

  const [options, setOpsi] = useState<string[]>([
    "",
  ]);

  const [allowOther, setAllowOther] =
    useState(false);

  const [otherLabel, setOtherLabel] =
    useState("");

  const [editingFieldId, setEditingFieldId] =
    useState<string | null>(null);

  // ======================================================
  // HELPERS
  // ======================================================

  const isOptionType = useMemo(() => {
    return type === "select" || type === "checkbox" || type === "radio";
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
    setEditingFieldId(null);
    setLabel("");
    setType("text");
    setFieldDescription("");
    setWajib(false);
    setOpsi([""]);
    setAllowOther(false);
    setOtherLabel("");
  };

  // ======================================================
  // CREATE FORM
  // ======================================================

  const handleCreateForm = async () => {
    if (!formData.name.trim()) {
      toast.error("Form name wajib diisi");
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

      payload.append("theme_color", themeColor);

      if (headerImage) {
        payload.append(
          "header_image",
          headerImage,
        );
      }

      const response = await createForm(payload);

      setCreatedForm(response);
      setThemeColor(response.theme_color || themeColor);

      window.requestAnimationFrame(() => {
        builderRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });

      toast.success(
        "Form berhasil dibuat. Sekarang tambahkan field.",
      );
    } catch (error) {
      console.error(error);

      toast.error("Gagal membuat form");
    } finally {
      setLoadingForm(false);
    }
  };

  // ======================================================
  // THEME
  // ======================================================

  const handleThemeChange = async (color: string) => {
    setThemeColor(color);

    if (!createdForm) return;

    try {
      const payload = new FormData();
      payload.append("theme_color", color);
      await updateForm(createdForm.id, payload);
      setCreatedForm((current) =>
        current ? { ...current, theme_color: color } : current,
      );
      toast.success("Warna form disimpan.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan warna form.");
    }
  };

  // ======================================================
  // ADD FIELD
  // ======================================================

  const handleStartEditField = (field: FormField) => {
    setEditingFieldId(field.id);
    setLabel(field.label);
    setType(field.type as FieldType);
    setFieldDescription(field.description || "");
    setWajib(Boolean(field.is_required));
    setOpsi(field.options?.length ? [...field.options] : [""]);
    setAllowOther(Boolean(field.allow_other));
    setOtherLabel(field.other_label || "");
  };

  const handleSaveField = async () => {
    if (!createdForm?.id) return;

    if (!label.trim()) {
      toast.error("Label field wajib diisi");
      return;
    }

    const wasEditing = Boolean(editingFieldId);

    try {
      setSavingField(true);

      const cleanOpsi = options
        .map((o) => o.trim())
        .filter(Boolean);

      const payload: Partial<FormField> = {
        label,
        type,
        description: fieldDescription.trim() || null,
        is_required: required,

        options: isOptionType
          ? cleanOpsi
          : [],

        allow_other: allowOther,

        other_label: allowOther
          ? otherLabel || "Other"
          : null,
      };

      if (editingFieldId) {
        const updatedField = await updateField(editingFieldId, payload);
        setFields((prev) =>
          prev.map((field) =>
            field.id === editingFieldId ? updatedField : field,
          ),
        );
      } else {
        const newField = await createField(
          createdForm.id,
          {
            ...payload,
            name: generateFieldName(label),
            order: fields.length,
          } as FormField,
        );
        setFields((prev) => [...prev, newField]);
      }

      resetFieldForm();
      toast.success(wasEditing ? "Field diperbarui." : "Field ditambahkan.");
    } catch (error) {
      console.error(error);

      toast.error(
        editingFieldId
          ? "Gagal mengubah field"
          : "Gagal menambahkan field",
      );
    } finally {
      setSavingField(false);
    }
  };

  // ======================================================
  // DELETE FIELD
  // ======================================================

  const handleHapusField = async (
    fieldId: string,
  ) => {
    const confirmed = await confirmDialog({
      message: "Hapus field ini?",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await deleteField(fieldId);

      setFields((prev) =>
        prev.filter((f) => f.id !== fieldId),
      );
      if (editingFieldId === fieldId) resetFieldForm();
      toast.success("Field dihapus.");
    } catch (error) {
      console.error(error);

      toast.error("Gagal menghapus field");
    }
  };

  const handleDuplicateField = async (field: FormField) => {
    if (!createdForm?.id) return;

    try {
      setSavingField(true);
      const duplicate = await createField(createdForm.id, {
        label: `${field.label} (copy)`,
        type: field.type,
        description: field.description ?? null,
        is_required: field.is_required,
        options: field.options ?? [],
        allow_other: field.allow_other ?? false,
        other_label: field.other_label ?? null,
        order: fields.length,
      } as Partial<FormField>);

      setFields((prev) => [...prev, duplicate]);
      toast.success("Field diduplikasi.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal menduplikasi field.");
    } finally {
      setSavingField(false);
    }
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="w-full pb-28">
      <div className="w-full">
        {/* ================================================= */}
        {/* PAGE HEADER */}
        {/* ================================================= */}

        <div className="mb-6 flex flex-col gap-4 border-b border-line pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
              Buat form
            </h1>

            <p className="mt-1 text-sm text-fg-muted">
              Susun form seperti Google Forms, lihat pratinjau langsung, lalu bagikan link publiknya.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-control border border-line bg-surface px-2 py-1">
              <Palette className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
              {FORM_THEMES.map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => void handleThemeChange(theme.value)}
                  aria-label={`Warna ${theme.label}`}
                  aria-pressed={themeColor === theme.value}
                  title={theme.label}
                  className={`h-5 w-5 rounded-full ring-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-offset-1 ${
                    themeColor === theme.value ? "ring-fg" : "ring-transparent"
                  }`}
                  style={{ backgroundColor: theme.value }}
                />
              ))}
              <label
                className="relative flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-line-strong text-fg-subtle"
                title="Warna kustom"
              >
                <input
                  type="color"
                  value={themeColor}
                  onChange={(event) => setThemeColor(event.target.value)}
                  onBlur={(event) => void handleThemeChange(event.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Pilih warna kustom"
                />
                <span className="text-[10px] font-semibold">+</span>
              </label>
            </div>

            <div className="flex items-center rounded-control border border-line bg-surface p-0.5 xl:hidden">
              <button
                type="button"
                onClick={() => setMobileView("editor")}
                aria-pressed={mobileView === "editor"}
                className={`h-7 rounded-[6px] px-2.5 text-[11px] font-medium ${
                  mobileView === "editor" ? "bg-surface-muted text-fg" : "text-fg-muted"
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setMobileView("preview")}
                aria-pressed={mobileView === "preview"}
                className={`inline-flex h-7 items-center gap-1 rounded-[6px] px-2.5 text-[11px] font-medium ${
                  mobileView === "preview" ? "bg-surface-muted text-fg" : "text-fg-muted"
                }`}
              >
                <Eye className="h-3 w-3" aria-hidden="true" />
                Pratinjau
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className={`min-w-0 ${mobileView === "preview" ? "hidden xl:block" : ""}`}>

        {/* ================================================= */}
        {/* FORM SETUP */}
        {/* ================================================= */}

        <div className="mb-4 overflow-hidden rounded-panel border border-line bg-surface shadow-e2">
          <div className="h-2 w-full" style={{ backgroundColor: themeColor }} />

          <div className="border-b border-line px-5 py-6 sm:px-7">
            <label className="sr-only" htmlFor="form-name">Nama form</label>
            <input
              id="form-name"
              type="text"
              value={formData.name}
              disabled={!!createdForm}
              onChange={(event) =>
                setFormData({ ...formData, name: event.target.value })
              }
              placeholder="Nama form"
              className="w-full border-0 border-b border-line bg-transparent pb-2 text-2xl font-medium text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent focus:ring-0 disabled:opacity-80"
            />

            <label className="sr-only" htmlFor="form-description">Deskripsi form</label>
            <textarea
              id="form-description"
              rows={2}
              disabled={!!createdForm}
              value={formData.description}
              onChange={(event) =>
                setFormData({ ...formData, description: event.target.value })
              }
              placeholder="Deskripsi form (opsional)"
              className="mt-3 w-full resize-none border-0 bg-transparent text-sm leading-6 text-fg-muted outline-none placeholder:text-fg-subtle focus:ring-0 disabled:opacity-80"
            />
          </div>

          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-7">
            <label className="flex items-start gap-3 rounded-card border border-line p-3.5">
              <input
                type="checkbox"
                checked={formData.is_active}
                disabled={!!createdForm}
                onChange={(event) =>
                  setFormData({ ...formData, is_active: event.target.checked })
                }
                style={{ accentColor: themeColor }}
              />
              <span>
                <span className="block text-xs font-medium text-fg">Form aktif</span>
                <span className="mt-0.5 block text-[11px] text-fg-muted">
                  Form dapat menerima jawaban
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-card border border-line p-3.5">
              <input
                type="checkbox"
                checked={formData.show_note}
                disabled={!!createdForm}
                onChange={(event) =>
                  setFormData({ ...formData, show_note: event.target.checked })
                }
                style={{ accentColor: themeColor }}
              />
              <span>
                <span className="block text-xs font-medium text-fg">Tampilkan catatan</span>
                <span className="mt-0.5 block text-[11px] text-fg-muted">
                  Tampilkan informasi tambahan di atas pertanyaan
                </span>
              </span>
            </label>

            <div className="sm:col-span-2">
              <label htmlFor="form-header-image" className="mb-1.5 block text-[11px] font-medium text-fg-muted">
                Gambar header (opsional)
              </label>
              <input
                id="form-header-image"
                type="file"
                accept="image/*"
                disabled={!!createdForm}
                onChange={(event) =>
                  setHeaderImage(event.target.files?.[0] || null)
                }
                className="block w-full cursor-pointer rounded-control border border-line bg-surface px-3 py-2 text-xs text-fg-muted file:mr-3 file:rounded-[6px] file:border-0 file:bg-surface-muted file:px-2.5 file:py-1 file:text-[11px] file:font-medium file:text-fg-muted disabled:cursor-not-allowed disabled:opacity-60"
              />
              {headerImage ? (
                <p className="mt-1.5 truncate text-[10px] text-fg-subtle">
                  Dipilih: {headerImage.name}
                </p>
              ) : null}
            </div>

            {formData.show_note ? (
              <div className="sm:col-span-2">
                <label htmlFor="form-note-content" className="mb-1.5 block text-[11px] font-medium text-fg-muted">
                  Isi catatan
                </label>
                <textarea
                  id="form-note-content"
                  rows={3}
                  disabled={!!createdForm}
                  value={formData.note_content}
                  onChange={(event) =>
                    setFormData({ ...formData, note_content: event.target.value })
                  }
                  placeholder="Tulis catatan untuk pengisi form..."
                  className="w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15 disabled:opacity-60"
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-[11px] text-fg-muted">
              {createdForm
                ? "Form sudah tersimpan. Tambahkan pertanyaan di bawah."
                : "Simpan form terlebih dahulu, lalu tambahkan pertanyaan."}
            </p>

            {!createdForm ? (
              <button
                onClick={() => void handleCreateForm()}
                disabled={loadingForm}
                className="inline-flex h-9 items-center justify-center rounded-control px-4 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor: themeColor,
                  color: readableTextColor(themeColor),
                }}
              >
                {loadingForm ? "Membuat..." : "Buat form & lanjut"}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 items-center rounded-full bg-success-soft px-3 text-[11px] font-medium text-success">
                  Form tersimpan
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/forms/${createdForm.id}/edit`)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-[11px] font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  Edit info
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ================================================= */}
        {/* BUILDER */}
        {/* ================================================= */}

        {createdForm && (
          <div className="mt-4 flex flex-col gap-4" ref={builderRef}>
            {/* ============================================= */}
            {/* FIELD EDITOR */}
            {/* ============================================= */}

            <div
              className={
                editingFieldId
                  ? "fixed inset-0 z-[100] flex items-center justify-center bg-overlay p-4"
                  : "order-2"
              }
              ref={fieldEditorRef}
              onClick={editingFieldId ? resetFieldForm : undefined}
              onKeyDown={
                editingFieldId
                  ? (event) => {
                      if (event.key === "Escape") resetFieldForm();
                    }
                  : undefined
              }
            >
              <div
                role={editingFieldId ? "dialog" : undefined}
                aria-modal={editingFieldId ? "true" : undefined}
                aria-labelledby={editingFieldId ? "field-editor-title" : undefined}
                className={
                  editingFieldId
                    ? "max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-modal border border-line bg-surface p-5 shadow-e3"
                    : "rounded-panel border border-line bg-surface p-5"
                }
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 id="field-editor-title" className="text-sm font-semibold text-fg">
                      {editingFieldId ? "Edit pertanyaan" : "Tambah pertanyaan"}
                    </h2>

                    <p className="mt-1 text-xs text-fg-muted">
                      {editingFieldId
                        ? "Perbarui pertanyaan ini, lalu simpan perubahan."
                        : "Atur pertanyaan baru untuk form."}
                    </p>
                  </div>

                  {editingFieldId ? (
                    <button
                      type="button"
                      onClick={resetFieldForm}
                      aria-label="Tutup editor pertanyaan"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>

                <div className="space-y-4">
                  {/* LABEL */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-fg-muted">
                      Label
                    </label>

                    <input
                      value={label}
                      onChange={(e) =>
                        setLabel(
                          e.target.value,
                        )
                      }
                      placeholder="Contoh: Nama lengkap"
                      className="w-full h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
                    />
                  </div>

                  {/* DESCRIPTION */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-fg-muted">
                      Deskripsi pertanyaan (opsional)
                    </label>

                    <textarea
                      rows={2}
                      value={fieldDescription}
                      onChange={(event) => setFieldDescription(event.target.value)}
                      placeholder="Panduan singkat di bawah pertanyaan"
                      className="w-full resize-none rounded-control border border-line bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
                    />
                  </div>

                  {/* TYPE */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-fg-muted">
                      Tipe pertanyaan
                    </label>

                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {FIELD_TYPES.map((fieldType) => {
                        const Icon = fieldType.icon;
                        const active = type === fieldType.value;

                        return (
                          <button
                            key={fieldType.value}
                            type="button"
                            onClick={() => {
                              setType(fieldType.value);
                              setOpsi([""]);
                              setAllowOther(false);
                              setOtherLabel("");
                            }}
                            aria-pressed={active}
                            className={`flex items-center gap-1.5 rounded-control border px-2 py-2 text-left text-[11px] font-medium transition-colors ${
                              active
                                ? "border-accent/40 bg-accent-soft text-accent"
                                : "border-line bg-surface text-fg-muted hover:bg-surface-muted hover:text-fg"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{fieldType.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* REQUIRED */}
                  <RequiredToggle
                    checked={required}
                    onChange={setWajib}
                  />

                  {/* OPTIONS */}
                  {isOptionType && (
                    <div className="rounded-card border border-line p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-800">
                          Opsi
                        </h3>

                        <button
                          type="button"
                          onClick={() =>
                            setOpsi([
                              ...options,
                              "",
                            ])
                          }
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          + Tambah
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

                                  setOpsi(
                                    updated,
                                  );
                                }}
                                placeholder={`Opsi ${
                                  index + 1
                                }`}
                                className="flex-1 h-9 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
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

                                  setOpsi(
                                    updated.length
                                      ? updated
                                      : [""],
                                  );
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-control border border-line text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
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
                            Izinkan opsi lain
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
                            placeholder="Label opsi lain"
                            className="mt-3 w-full h-9 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* BUTTON */}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {editingFieldId && (
                      <button
                        type="button"
                        onClick={resetFieldForm}
                        className="inline-flex w-full items-center justify-center gap-2 inline-flex h-9 items-center justify-center rounded-control border border-line bg-surface px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg sm:w-auto"
                      >
                        <X size={16} />
                        Batal
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveField}
                      disabled={savingField}
                      className="inline-flex w-full items-center justify-center gap-2 inline-flex h-9 items-center justify-center rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingField
                        ? "Menyimpan..."
                        : editingFieldId
                          ? "Simpan perubahan"
                          : "Tambah field"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================= */}
            {/* QUESTION LIST */}
            {/* ============================================= */}

            <div className="order-1">
              <div className="rounded-panel border border-line bg-surface p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-fg">
                      Daftar pertanyaan
                    </h2>

                    <p className="mt-1 text-sm text-fg-muted">
                      Total field: {fields.length}
                    </p>
                  </div>
                </div>

                {!fields.length ? (
                  <div className="rounded-card border border-dashed border-line p-10 text-center">
                    <div className="text-sm font-medium text-fg">
                      Belum ada pertanyaan
                    </div>

                    <p className="mt-2 text-xs text-fg-muted">
                      Tambahkan pertanyaan pertama dari panel editor di bawah.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className="rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-medium text-fg">
                                {field.label}
                              </h3>

                              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium capitalize text-fg-muted">
                                {field.type}
                              </span>

                              {field.is_required ? (
                                <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-medium text-danger">
                                  Wajib
                                </span>
                              ) : null}
                            </div>

                            {field.description ? (
                              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-fg-muted">
                                {field.description}
                              </p>
                            ) : null}

                            {field.options?.length ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {field.options.map((option, index) => (
                                  <span
                                    key={index}
                                    className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-medium text-accent"
                                  >
                                    {option}
                                  </span>
                                ))}

                                {field.allow_other ? (
                                  <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-[10px] font-medium text-success">
                                    {field.other_label || "Lainnya"}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleDuplicateField(field)}
                              disabled={savingField}
                              className="flex h-8 w-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg disabled:cursor-wait disabled:opacity-50"
                              aria-label={`Duplikasi field ${field.label}`}
                              title="Duplikasi field"
                            >
                              <Copy size={13} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEditField(field)}
                              className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                            >
                              <Pencil size={13} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHapusField(field.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                              aria-label={`Hapus field ${field.label}`}
                              title="Hapus field"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {createdForm ? (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => navigate("/forms")}
              className="inline-flex h-9 items-center rounded-control px-4 text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                backgroundColor: themeColor,
                color: readableTextColor(themeColor),
              }}
            >
              Selesai
            </button>
          </div>
        ) : null}
          </div>

          <div className={`min-w-0 ${mobileView === "editor" ? "hidden xl:block" : ""}`}>
            <div className="space-y-3 xl:sticky xl:top-6">
              <FormPreview
                name={formData.name}
                description={formData.description}
                themeColor={themeColor}
                fields={fields}
                showNote={formData.show_note}
                noteContent={formData.note_content}
                headerImageName={headerImage?.name}
              />
              <p className="px-1 text-[10px] leading-4 text-fg-subtle">
                Pratinjau ini mengikuti isi editor dan warna yang dipilih. Form publik memakai tema yang sama setelah disimpan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormPreview({
  name,
  description,
  themeColor,
  fields,
  showNote,
  noteContent,
  headerImageName,
}: {
  name: string;
  description: string;
  themeColor: string;
  fields: FormField[];
  showNote: boolean;
  noteContent: string;
  headerImageName?: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-e2">
      <div className="h-2 w-full" style={{ backgroundColor: themeColor }} />

      <div className="border-b border-line px-5 py-5">
        <p className="text-[10px] font-medium text-fg-subtle">Pratinjau form</p>
        <h3 className="mt-2 break-words text-xl font-medium text-fg">
          {name.trim() || "Form tanpa judul"}
        </h3>
        {description.trim() ? (
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-fg-muted">
            {description}
          </p>
        ) : null}
        {headerImageName ? (
          <p className="mt-2 truncate text-[10px] text-fg-subtle">
            Header: {headerImageName}
          </p>
        ) : null}
      </div>

      {showNote && noteContent.trim() ? (
        <div className="mx-4 mt-4 rounded-card border border-warning/20 bg-warning-soft px-3 py-2.5 text-xs leading-5 text-warning">
          {noteContent}
        </div>
      ) : null}

      <div className="space-y-3 p-4">
        {fields.length === 0 ? (
          <div className="rounded-card border border-dashed border-line px-4 py-8 text-center">
            <p className="text-xs font-medium text-fg-muted">
              Pertanyaan akan tampil di sini
            </p>
            <p className="mt-1 text-[11px] text-fg-subtle">
              Tambahkan field untuk melihat bentuk form publiknya.
            </p>
          </div>
        ) : (
          fields.map((field) => (
            <PreviewField key={field.id} field={field} accent={themeColor} />
          ))
        )}
      </div>

      <div className="border-t border-line px-4 py-4">
        <button
          type="button"
          disabled
          className="h-9 rounded-control px-4 text-sm font-medium opacity-90"
          style={{
            backgroundColor: themeColor,
            color: readableTextColor(themeColor),
          }}
        >
          Kirim
        </button>
        <p className="mt-2 text-[10px] text-fg-subtle">
          Ini pratinjau. Form publik memiliki tombol aktif.
        </p>
      </div>
    </div>
  );
}

function PreviewField({
  field,
  accent,
}: {
  field: FormField;
  accent: string;
}) {
  if (field.type === "section") {
    return (
      <div className="rounded-card border border-line bg-surface-muted/40 px-3 py-2.5">
        <p className="text-xs font-semibold text-fg">{field.label}</p>
        {field.description ? (
          <p className="mt-1 text-[11px] text-fg-muted">{field.description}</p>
        ) : null}
      </div>
    );
  }

  const options = field.options?.length ? field.options : ["Opsi 1"];

  return (
    <div className="rounded-card border border-line bg-surface px-3.5 py-3">
      <p className="text-xs font-medium text-fg">
        {field.label}
        {field.is_required ? <span className="ml-0.5 text-danger">*</span> : null}
      </p>

      {field.description ? (
        <p className="mt-1 text-[10px] leading-4 text-fg-muted">{field.description}</p>
      ) : null}

      {field.type === "textarea" ? (
        <div className="mt-2 h-14 rounded-control border-b border-line bg-surface-muted/40" />
      ) : field.type === "select" ? (
        <div className="mt-2 h-8 rounded-control border border-line bg-surface-muted/40 px-2 text-[11px] leading-8 text-fg-subtle">
          Pilih opsi
        </div>
      ) : field.type === "radio" || field.type === "checkbox" ? (
        <div className="mt-2 space-y-1.5">
          {options.slice(0, 4).map((option, index) => (
            <div key={`${field.id}-${index}`} className="flex items-center gap-2 text-[11px] text-fg-muted">
              <span
                className={`h-3 w-3 border border-line-strong ${
                  field.type === "radio" ? "rounded-full" : "rounded-[3px]"
                }`}
                aria-hidden="true"
              />
              {option}
            </div>
          ))}
          {field.allow_other ? (
            <div className="flex items-center gap-2 text-[11px] text-fg-muted">
              <span
                className={`h-3 w-3 border border-line-strong ${
                  field.type === "radio" ? "rounded-full" : "rounded-[3px]"
                }`}
                aria-hidden="true"
              />
              {field.other_label || "Lainnya"}
            </div>
          ) : null}
        </div>
      ) : field.type === "file" ? (
        <div className="mt-2 rounded-control border border-dashed border-line-strong bg-surface-muted/30 px-3 py-4 text-center text-[11px] text-fg-subtle">
          Unggah file
        </div>
      ) : (
        <div className="mt-2 h-8 rounded-control border-b border-line bg-surface-muted/40" />
      )}

      <div className="mt-2 h-0.5 w-10 rounded-full" style={{ backgroundColor: accent }} />
    </div>
  );
}


