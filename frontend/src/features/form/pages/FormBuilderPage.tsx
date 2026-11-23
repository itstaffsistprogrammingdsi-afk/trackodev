import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import {
  AlignLeft,
  ArrowLeft,
  Calendar,
  CheckSquare,
  CircleDot,
  Copy,
  ExternalLink,
  Hash,
  Heading,
  List,
  ListChecks,
  Pencil,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import {
  getForm,
  createField,
  updateField,
  deleteField,
} from "../api/form.api";
import type { Form, FormField } from "../types";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import { toast, confirmDialog } from "@/lib/feedback";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import RequiredToggle from "../components/RequiredToggle";

const FIELD_TYPES: Array<{
  value: FormField["type"];
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
  const [fieldDescription, setFieldDescription] = useState("");
  const [required, setRequired] = useState(false);

  const [options, setOptions] = useState<string[]>([""]);

  // ✅ OTHER FEATURE (FIXED PROPERLY)
  const [allowOther, setAllowOther] = useState(false);
  const [otherLabel, setOtherLabel] = useState("");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [savingField, setSavingField] = useState(false);

  // The app shell owns the scroll position in an internal <main> element.
  // Keeping refs to the editor and its first input lets us navigate that
  // scroll container reliably when a field is edited.
  const fieldEditorRef = useRef<HTMLDivElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const fetchForm = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getForm(id);
      setForm(data);
    } catch (error) {
      console.error(error);
      toast.error("Gagal load form");
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
    setFieldDescription("");
    setRequired(false);
    setOptions([""]);
    setAllowOther(false);
    setOtherLabel("");
  };

  const handleStartEditField = (field: FormField) => {
    setEditingFieldId(field.id);
    setLabel(field.label);
    setType(field.type);
    setFieldDescription(field.description || "");
    setRequired(Boolean(field.is_required));
    setOptions(field.options?.length ? [...field.options] : [""]);
    setAllowOther(Boolean(field.allow_other));
    setOtherLabel(field.other_label || "");
  };

  useEffect(() => {
    if (!editingFieldId) return;

    // Editor edit tampil sebagai modal; cukup fokuskan input pertama tanpa
    // menggeser halaman di belakang overlay.
    const frame = window.requestAnimationFrame(() => {
      labelInputRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [editingFieldId]);

  const handleSaveField = async () => {
    if (!id || !label.trim()) {
      toast.error("Label wajib diisi");
      return;
    }

    const wasEditing = Boolean(editingFieldId);

    try {
      setSavingField(true);
      const cleanOptions = options
        .map((o) => o.trim())
        .filter(Boolean);

      const payload: Partial<FormField> = {
        label,
        type,
        description: fieldDescription.trim() || null,
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
      toast.success(wasEditing ? "Field diperbarui." : "Field ditambahkan.");

      await fetchForm();
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

  const handleDeleteField = async (fieldId: string) => {
    if (!(await confirmDialog({ message: "Hapus field ini?", variant: "danger" }))) return;

    try {
      await deleteField(fieldId);
      if (editingFieldId === fieldId) resetFieldEditor();
      await fetchForm();
      toast.success("Field dihapus.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal hapus field");
    }
  };

  const handleDuplicateField = async (field: FormField) => {
    try {
      setSavingField(true);
      await createField(field.form_id, {
        label: `${field.label} (copy)`,
        type: field.type,
        description: field.description ?? null,
        is_required: field.is_required,
        options: field.options ?? [],
        allow_other: field.allow_other ?? false,
        other_label: field.other_label ?? null,
        order: form?.fields?.length ?? 0,
      } as Partial<FormField>);

      await fetchForm();
      toast.success("Field diduplikasi.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal menduplikasi field.");
    } finally {
      setSavingField(false);
    }
  };

  useEffect(() => {
    fetchForm();
  }, [fetchForm, id, realtimeRevision]);

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true">
        <span className="sr-only">Memuat builder form</span>
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-52 w-full rounded-panel" />
        <Skeleton className="h-64 w-full rounded-panel" />
      </div>
    );
  }

  if (!form) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Form tidak ditemukan"
        description="Form mungkin sudah dihapus atau Anda tidak memiliki akses."
        action={{ label: "Kembali ke daftar form", onClick: () => window.location.assign("/forms") }}
      />
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <Link
            to="/forms"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Semua form
          </Link>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-[-0.02em] text-fg">
            {form.name}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Form builder · {form.fields?.length ?? 0} field
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/public/forms/${form.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Buka form
          </a>
          {can("form.update") ? (
            <Link
              to={`/forms/${form.id}/edit`}
              className="inline-flex h-9 items-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit info form
            </Link>
          ) : null}
        </div>
      </div>

      {/* CREATE / EDIT FIELD */}
      {(canCreateField || editingFieldId) && (
      <div
        className={
          editingFieldId
            ? "fixed inset-0 z-[100] flex items-center justify-center bg-overlay p-4"
            : ""
        }
        onClick={editingFieldId ? resetFieldEditor : undefined}
        onKeyDown={
          editingFieldId
            ? (event) => {
                if (event.key === "Escape") resetFieldEditor();
              }
            : undefined
        }
      >
      <div
        ref={fieldEditorRef}
        id="field-editor"
        role={editingFieldId ? "dialog" : "region"}
        aria-modal={editingFieldId ? "true" : undefined}
        aria-labelledby="field-editor-title"
        onClick={(event) => event.stopPropagation()}
        className={
          editingFieldId
            ? "max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-modal border border-line bg-surface p-5 shadow-e3"
            : "mb-6 scroll-mt-6 rounded-panel border border-line bg-surface p-5"
        }
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="field-editor-title" className="text-sm font-semibold text-fg">
              {editingFieldId ? "Edit pertanyaan" : "Tambah pertanyaan"}
            </h2>
            <p className="mt-1 text-xs text-fg-muted">
              {editingFieldId
                ? "Perbarui pertanyaan ini, lalu simpan perubahan."
                : "Tambahkan pertanyaan baru ke form ini."}
            </p>
          </div>

          {editingFieldId ? (
            <div className="flex shrink-0 items-center gap-2">
              <p className="hidden text-[10px] font-medium text-accent sm:block" aria-live="polite">
                Belum disimpan
              </p>
              <button
                type="button"
                onClick={resetFieldEditor}
                aria-label="Tutup editor pertanyaan"
                className="flex h-8 w-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="builder-field-label" className="mb-1.5 block text-xs font-medium text-fg-muted">
              Label pertanyaan
            </label>
            <input
              id="builder-field-label"
              ref={labelInputRef}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Contoh: Nama lengkap"
              className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
            />
          </div>

          <div>
            <label htmlFor="builder-field-description" className="mb-1.5 block text-xs font-medium text-fg-muted">
              Deskripsi pertanyaan (opsional)
            </label>
            <textarea
              id="builder-field-description"
              rows={2}
              value={fieldDescription}
              onChange={(event) => setFieldDescription(event.target.value)}
              placeholder="Panduan singkat di bawah pertanyaan"
              className="w-full resize-none rounded-control border border-line bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-fg-muted">
              Tipe pertanyaan
            </span>
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
                      setOptions([""]);
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

          <RequiredToggle checked={required} onChange={setRequired} />
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
              + Tambah opsi
            </button>

            {/* OTHER */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowOther}
                onChange={(e) => setAllowOther(e.target.checked)}
              />
              <span className="text-sm">Izinkan opsi "Other"</span>
            </div>

            {allowOther && (
              <input
                value={otherLabel}
                onChange={(e) => setOtherLabel(e.target.value)}
                placeholder="Label opsi Other (default: Other)"
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
              className="inline-flex h-9 items-center justify-center gap-2 rounded-control border border-line bg-surface px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
            >
              <X size={16} />
              Batal
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveField}
            disabled={savingField}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
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
      )}

      {/* FIELD LIST */}
      <div className="overflow-hidden rounded-panel border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-fg">Field form</h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              Urutan field mengikuti urutan saat form publik dibuka.
            </p>
          </div>
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium tabular-nums text-fg-muted">
            {form.fields?.length ?? 0} field
          </span>
        </div>

        <div className="p-3 sm:p-4">
          {form.fields?.length ? (
            <div className="space-y-2">
              {form.fields.map((field: FormField) => (
                <div
                  key={field.id}
                  className="flex flex-col gap-3 rounded-card border border-line p-3.5 transition-colors hover:border-line-strong sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-fg">
                        {field.label}
                      </span>
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium capitalize text-fg-muted">
                        {field.type}
                      </span>
                      {field.is_required ? (
                        <span className="text-[10px] font-medium text-danger">
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
                            key={`${field.id}-${index}`}
                            className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-fg-muted"
                          >
                            {option}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {field.allow_other ? (
                      <p className="mt-1.5 text-[10px] text-accent">
                        Opsi “Other” aktif
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {canCreateField ? (
                      <button
                        type="button"
                        onClick={() => void handleDuplicateField(field)}
                        disabled={savingField}
                        className="flex h-8 w-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg disabled:cursor-wait disabled:opacity-50"
                        aria-label={`Duplikasi field ${field.label}`}
                        title="Duplikasi field"
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    ) : null}
                    {canUpdateField ? (
                      <button
                        type="button"
                        onClick={() => handleStartEditField(field)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </button>
                    ) : null}
                    {canDeleteField ? (
                      <button
                        type="button"
                        onClick={() => void handleDeleteField(field.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                        aria-label={`Hapus field ${field.label}`}
                        title="Hapus field"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={ListChecks}
              title="Belum ada field"
              description="Tambahkan field pertama di editor di atas. Mulai dari teks singkat atau pilihan status."
            />
          )}
        </div>
      </div>
    </div>
  );
}


