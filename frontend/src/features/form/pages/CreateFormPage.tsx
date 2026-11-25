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
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useDivisions } from "@/features/division/hooks/useDivisions";

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
  labelEn: string;
  icon: typeof Type;
}> = [
  { value: "text", label: "Teks singkat", labelEn: "Short text", icon: Type },
  { value: "textarea", label: "Paragraf", labelEn: "Paragraph", icon: AlignLeft },
  { value: "number", label: "Angka", labelEn: "Number", icon: Hash },
  { value: "date", label: "Tanggal", labelEn: "Date", icon: Calendar },
  { value: "file", label: "Upload file", labelEn: "File upload", icon: Upload },
  { value: "select", label: "Dropdown", labelEn: "Dropdown", icon: List },
  { value: "checkbox", label: "Checkbox", labelEn: "Checkbox", icon: CheckSquare },
  { value: "radio", label: "Pilihan ganda", labelEn: "Multiple choice", icon: CircleDot },
  { value: "section", label: "Section", labelEn: "Section", icon: Heading },
];

// ======================================================
// PAGE
// ======================================================

export default function CreateFormBuilderPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const auth = useAuth();

  const canViewAllDivisions = useMemo(
    () => auth.hasRole("super_admin") || auth.can("division.view_all"),
    [auth],
  );

  const { data: myDivisions } = useDivisions(true, !canViewAllDivisions);
  const { data: allDivisions } = useDivisions(false, canViewAllDivisions);
  const divisions = canViewAllDivisions ? allDivisions : myDivisions;

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

  const [divisionId, setDivisionId] = useState("");

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
      toast.error(t("Form name wajib diisi", "Form name is required"));
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

      payload.append("division_id", divisionId);

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
        t(
          "Form berhasil dibuat. Sekarang tambahkan field.",
          "Form created successfully. Now add fields.",
        ),
      );
    } catch (error) {
      console.error(error);

      toast.error(t("Gagal membuat form", "Failed to create form"));
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
      toast.success(t("Warna form disimpan.", "Form color saved."));
    } catch (error) {
      console.error(error);
      toast.error(t("Gagal menyimpan warna form.", "Failed to save form color."));
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
      toast.error(t("Label field wajib diisi", "Field label is required"));
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
      toast.success(
        wasEditing
          ? t("Field diperbarui.", "Field updated.")
          : t("Field ditambahkan.", "Field added."),
      );
    } catch (error) {
      console.error(error);

      toast.error(
        editingFieldId
          ? t("Gagal mengubah field", "Failed to update field")
          : t("Gagal menambahkan field", "Failed to add field"),
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
      message: t("Hapus field ini?", "Delete this field?"),
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await deleteField(fieldId);

      setFields((prev) =>
        prev.filter((f) => f.id !== fieldId),
      );
      if (editingFieldId === fieldId) resetFieldForm();
      toast.success(t("Field dihapus.", "Field deleted."));
    } catch (error) {
      console.error(error);

      toast.error(t("Gagal menghapus field", "Failed to delete field"));
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
      toast.success(t("Field diduplikasi.", "Field duplicated."));
    } catch (error) {
      console.error(error);
      toast.error(t("Gagal menduplikasi field.", "Failed to duplicate field."));
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
              {t("Buat form", "Create form")}
            </h1>

            <p className="mt-1 text-sm text-fg-muted">
              {t(
                "Susun form seperti Google Forms, lihat pratinjau langsung, lalu bagikan link publiknya.",
                "Build a form like Google Forms, preview it live, then share its public link.",
              )}
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
                  aria-label={t("Warna {color}", "Color {color}", { color: theme.label })}
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
                title={t("Warna kustom", "Custom color")}
              >
                <input
                  type="color"
                  value={themeColor}
                  onChange={(event) => setThemeColor(event.target.value)}
                  onBlur={(event) => void handleThemeChange(event.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label={t("Pilih warna kustom", "Choose custom color")}
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
                {t("Editor", "Editor")}
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
                {t("Pratinjau", "Preview")}
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
            <label className="sr-only" htmlFor="form-name">
              {t("Nama form", "Form name")}
            </label>
            <input
              id="form-name"
              type="text"
              value={formData.name}
              disabled={!!createdForm}
              onChange={(event) =>
                setFormData({ ...formData, name: event.target.value })
              }
              placeholder={t("Nama form", "Form name")}
              className="w-full border-0 border-b border-line bg-transparent pb-2 text-2xl font-medium text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent focus:ring-0 disabled:opacity-80"
            />

            <label className="sr-only" htmlFor="form-description">
              {t("Deskripsi form", "Form description")}
            </label>
            <textarea
              id="form-description"
              rows={2}
              disabled={!!createdForm}
              value={formData.description}
              onChange={(event) =>
                setFormData({ ...formData, description: event.target.value })
              }
              placeholder={t("Deskripsi form (opsional)", "Form description (optional)")}
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
                <span className="block text-xs font-medium text-fg">
                  {t("Form aktif", "Form active")}
                </span>
                <span className="mt-0.5 block text-[11px] text-fg-muted">
                  {t("Form dapat menerima jawaban", "The form can receive responses")}
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
                <span className="block text-xs font-medium text-fg">
                  {t("Tampilkan catatan", "Show note")}
                </span>
                <span className="mt-0.5 block text-[11px] text-fg-muted">
                  {t(
                    "Tampilkan informasi tambahan di atas pertanyaan",
                    "Show extra information above the questions",
                  )}
                </span>
              </span>
            </label>

            <div className="sm:col-span-2">
              <label htmlFor="form-division" className="mb-1.5 block text-[11px] font-medium text-fg-muted">
                {t("Divisi", "Division")}
              </label>
              <select
                id="form-division"
                value={divisionId}
                disabled={!!createdForm}
                onChange={(event) => setDivisionId(event.target.value)}
                className="h-9 w-full max-w-xs rounded-control border border-line bg-surface px-2.5 text-sm text-fg outline-none transition-colors focus:border-accent/40 focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">{t("Umum", "General")}</option>
                {(divisions ?? []).map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[10px] leading-4 text-fg-subtle">
                {t(
                  "Form akan dikelompokkan di bawah divisi ini.",
                  "This form will be grouped under this division.",
                )}
              </p>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="form-header-image" className="mb-1.5 block text-[11px] font-medium text-fg-muted">
                {t("Gambar header (opsional)", "Header image (optional)")}
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
                  {t("Dipilih: {name}", "Selected: {name}", {
                    name: headerImage.name,
                  })}
                </p>
              ) : null}
            </div>

            {formData.show_note ? (
              <div className="sm:col-span-2">
                <label htmlFor="form-note-content" className="mb-1.5 block text-[11px] font-medium text-fg-muted">
                  {t("Isi catatan", "Note content")}
                </label>
                <textarea
                  id="form-note-content"
                  rows={3}
                  disabled={!!createdForm}
                  value={formData.note_content}
                  onChange={(event) =>
                    setFormData({ ...formData, note_content: event.target.value })
                  }
                  placeholder={t(
                    "Tulis catatan untuk pengisi form...",
                    "Write a note for respondents...",
                  )}
                  className="w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15 disabled:opacity-60"
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-[11px] text-fg-muted">
              {createdForm
                ? t(
                    "Form sudah tersimpan. Tambahkan pertanyaan di bawah.",
                    "Form saved. Add questions below.",
                  )
                : t(
                    "Simpan form terlebih dahulu, lalu tambahkan pertanyaan.",
                    "Save the form first, then add questions.",
                  )}
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
                {loadingForm ? t("Membuat...", "Creating...") : t("Buat form & lanjut", "Create form & continue")}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 items-center rounded-full bg-success-soft px-3 text-[11px] font-medium text-success">
                  {t("Form tersimpan", "Form saved")}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/forms/${createdForm.id}/edit`)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-[11px] font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  {t("Edit info", "Edit info")}
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
                      {editingFieldId
                        ? t("Edit pertanyaan", "Edit question")
                        : t("Tambah pertanyaan", "Add question")}
                    </h2>

                    <p className="mt-1 text-xs text-fg-muted">
                      {editingFieldId
                        ? t(
                            "Perbarui pertanyaan ini, lalu simpan perubahan.",
                            "Update this question, then save your changes.",
                          )
                        : t(
                            "Atur pertanyaan baru untuk form.",
                            "Set up a new question for the form.",
                          )}
                    </p>
                  </div>

                  {editingFieldId ? (
                    <button
                      type="button"
                      onClick={resetFieldForm}
                      aria-label={t("Tutup editor pertanyaan", "Close question editor")}
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
                      {t("Label", "Label")}
                    </label>

                    <input
                      value={label}
                      onChange={(e) =>
                        setLabel(
                          e.target.value,
                        )
                      }
                      placeholder={t("Contoh: Nama lengkap", "Example: Full name")}
                      className="w-full h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
                    />
                  </div>

                  {/* DESCRIPTION */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-fg-muted">
                      {t("Deskripsi pertanyaan (opsional)", "Question description (optional)")}
                    </label>

                    <textarea
                      rows={2}
                      value={fieldDescription}
                      onChange={(event) => setFieldDescription(event.target.value)}
                      placeholder={t(
                        "Panduan singkat di bawah pertanyaan",
                        "Short guidance below the question",
                      )}
                      className="w-full resize-none rounded-control border border-line bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
                    />
                  </div>

                  {/* TYPE */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-fg-muted">
                      {t("Tipe pertanyaan", "Question type")}
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
                            <span className="truncate">{t(fieldType.label, fieldType.labelEn)}</span>
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
                        <h3 className="text-sm font-semibold text-fg">
                          {t("Opsi", "Options")}
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
                          {t("+ Tambah", "+ Add")}
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
                                placeholder={t(
                                  `Opsi ${index + 1}`,
                                  `Option ${index + 1}`,
                                )}
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

                          <span className="text-sm text-fg-muted">
                            {t("Izinkan opsi lain", "Allow another option")}
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
                            placeholder={t("Label opsi lain", "Other option label")}
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
                        {t("Batal", "Cancel")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveField}
                      disabled={savingField}
                      className="inline-flex w-full items-center justify-center gap-2 inline-flex h-9 items-center justify-center rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingField
                        ? t("Menyimpan...", "Saving...")
                        : editingFieldId
                          ? t("Simpan perubahan", "Save changes")
                          : t("Tambah field", "Add field")}
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
                      {t("Daftar pertanyaan", "Question list")}
                    </h2>

                    <p className="mt-1 text-sm text-fg-muted">
                      {t("Total field: {count}", "Total fields: {count}", {
                        count: fields.length,
                      })}
                    </p>
                  </div>
                </div>

                {!fields.length ? (
                  <div className="rounded-card border border-dashed border-line p-10 text-center">
                    <div className="text-sm font-medium text-fg">
                      {t("Belum ada pertanyaan", "No questions yet")}
                    </div>

                    <p className="mt-2 text-xs text-fg-muted">
                      {t(
                        "Tambahkan pertanyaan pertama dari panel editor di bawah.",
                        "Add your first question from the editor panel below.",
                      )}
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
                                  {t("Wajib", "Required")}
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
                                    {field.other_label || t("Lainnya", "Other")}
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
                              aria-label={t("Duplikasi field {label}", "Duplicate field {label}", {
                                label: field.label,
                              })}
                              title={t("Duplikasi field", "Duplicate field")}
                            >
                              <Copy size={13} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEditField(field)}
                              className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                            >
                              <Pencil size={13} />
                              {t("Edit", "Edit")}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHapusField(field.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                              aria-label={t("Hapus field {label}", "Delete field {label}", {
                                label: field.label,
                              })}
                              title={t("Hapus field", "Delete field")}
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
              {t("Selesai", "Done")}
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
                {t(
                  "Pratinjau ini mengikuti isi editor dan warna yang dipilih. Form publik memakai tema yang sama setelah disimpan.",
                  "This preview follows the editor content and selected color. The public form uses the same theme once saved.",
                )}
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
  const { t } = useLanguage();

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-e2">
      <div className="h-2 w-full" style={{ backgroundColor: themeColor }} />

      <div className="border-b border-line px-5 py-5">
        <p className="text-[10px] font-medium text-fg-subtle">
          {t("Pratinjau form", "Form preview")}
        </p>
        <h3 className="mt-2 break-words text-xl font-medium text-fg">
          {name.trim() || t("Form tanpa judul", "Untitled form")}
        </h3>
        {description.trim() ? (
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-fg-muted">
            {description}
          </p>
        ) : null}
        {headerImageName ? (
          <p className="mt-2 truncate text-[10px] text-fg-subtle">
            {t("Header: {name}", "Header: {name}", { name: headerImageName })}
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
              {t("Pertanyaan akan tampil di sini", "Questions will appear here")}
            </p>
            <p className="mt-1 text-[11px] text-fg-subtle">
              {t(
                "Tambahkan field untuk melihat bentuk form publiknya.",
                "Add a field to see how the public form looks.",
              )}
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
          {t("Kirim", "Submit")}
        </button>
        <p className="mt-2 text-[10px] text-fg-subtle">
          {t(
            "Ini pratinjau. Form publik memiliki tombol aktif.",
            "This is a preview. The public form has an active button.",
          )}
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
  const { t } = useLanguage();

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

  const options = field.options?.length ? field.options : [t("Opsi 1", "Option 1")];

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
          {t("Pilih opsi", "Select an option")}
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
              {field.other_label || t("Lainnya", "Other")}
            </div>
          ) : null}
        </div>
      ) : field.type === "file" ? (
        <div className="mt-2 rounded-control border border-dashed border-line-strong bg-surface-muted/30 px-3 py-4 text-center text-[11px] text-fg-subtle">
          {t("Unggah file", "Upload file")}
        </div>
      ) : (
        <div className="mt-2 h-8 rounded-control border-b border-line bg-surface-muted/40" />
      )}

      <div className="mt-2 h-0.5 w-10 rounded-full" style={{ backgroundColor: accent }} />
    </div>
  );
}


