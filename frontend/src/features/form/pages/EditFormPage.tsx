import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { getForm, updateForm } from "../api/form.api";
import { toast } from "@/lib/feedback";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useDivisions } from "@/features/division/hooks/useDivisions";

export default function EditFormPage() {
  const { id } = useParams<{ id: string }>();
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
    show_note: false,
    note_content: "",
  });

  const [divisionId, setDivisionId] = useState("");

  const [headerImage, setHeaderImage] = useState<File | null>(null);

  const fetchForm = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);

      const data = await getForm(id);

      setFormData({
        name: data.name,
        description: data.description || "",
        is_active: data.is_active,
        show_note: data.show_note,
        note_content: data.note_content || "",
      });
      setDivisionId(data.division_id ?? "");
    } catch (error) {
      console.error(error);
      toast.error(t("Gagal load form", "Failed to load form"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  const handleSubmit = async () => {
    if (!id) return;

    try {
      setSaving(true);

      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("description", formData.description);
      payload.append("is_active", formData.is_active ? "1" : "0");
      payload.append("show_note", formData.show_note ? "1" : "0");
      payload.append("note_content", formData.note_content);
      payload.append("division_id", divisionId);

      if (headerImage) {
        payload.append("header_image", headerImage);
      }

      await updateForm(id, payload);

      toast.success(t("Form berhasil diupdate", "Form updated successfully"));
      navigate("/forms");
    } catch (error) {
      console.error(error);
      toast.error(t("Gagal update form", "Failed to update form"));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void fetchForm();
  }, [fetchForm]);

  if (loading) {
    return <div className="p-6">{t("Memuat form...", "Loading form...")}</div>;
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl rounded-panel border border-line bg-surface p-6 shadow-e1">
        <h1 className="mb-6 text-2xl font-bold">{t("Edit form", "Edit form")}</h1>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">
              {t("Nama form", "Form name")}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border px-4 py-2"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              {t("Deskripsi", "Description")}
            </label>
            <textarea
              rows={4}
              className="w-full rounded-lg border px-4 py-2"
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label htmlFor="form-division" className="mb-2 block text-sm font-medium">
              {t("Divisi", "Division")}
            </label>
            <select
              id="form-division"
              className="w-full rounded-lg border px-4 py-2"
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
            >
              <option value="">{t("Umum", "General")}</option>
              {(divisions ?? []).map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-fg-muted">
              {t(
                "Form akan dikelompokkan di bawah divisi ini.",
                "This form will be grouped under this division.",
              )}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              {t("Gambar header", "Header image")}
            </label>
            <input
              type="file"
              className="w-full rounded-lg border px-4 py-2"
              onChange={(e) =>
                setHeaderImage(e.target.files?.[0] || null)
              }
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  is_active: e.target.checked,
                })
              }
            />
            <span>{t("Aktif", "Active")}</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.show_note}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  show_note: e.target.checked,
                })
              }
            />
            <span>{t("Tampilkan catatan", "Show note")}</span>
          </div>

          {formData.show_note && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t("Isi catatan", "Note content")}
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border px-4 py-2"
                value={formData.note_content}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    note_content: e.target.value,
                  })
                }
              />
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => navigate("/forms")}
              className="rounded-lg border px-4 py-2"
            >
              {t("Batal", "Cancel")}
            </button>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2 text-white"
            >
              {saving ? t("Menyimpan...", "Saving...") : t("Perbarui", "Update")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
