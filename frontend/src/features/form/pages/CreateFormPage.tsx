import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createForm } from "../api/form.api";

export default function CreateFormPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
    show_note: false,
    note_content: "",
  });

  const [headerImage, setHeaderImage] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert("Nama form wajib diisi");
      return;
    }

    try {
      setLoading(true);

      const payload = new FormData();

      payload.append("name", formData.name);
      payload.append("description", formData.description);
      payload.append("is_active", formData.is_active ? "1" : "0");
      payload.append("show_note", formData.show_note ? "1" : "0");
      payload.append("note_content", formData.note_content);

      if (headerImage) {
        payload.append("header_image", headerImage);
      }

      await createForm(payload);

      alert("Form berhasil dibuat");
      navigate("/forms");
    } catch (error) {
      console.error(error);
      alert("Gagal membuat form");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold">Create Form</h1>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Form Name
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
              Description
            </label>
            <textarea
              className="w-full rounded-lg border px-4 py-2"
              rows={4}
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
            <label className="mb-2 block text-sm font-medium">
              Header Image
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
            <span>Active</span>
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
            <span>Show Note</span>
          </div>

          {formData.show_note && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Note Content
              </label>
              <textarea
                className="w-full rounded-lg border px-4 py-2"
                rows={3}
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
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-5 py-2 text-white"
            >
              {loading ? "Saving..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}