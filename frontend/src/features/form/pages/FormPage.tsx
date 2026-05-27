import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getForms, deleteForm } from "../api/form.api";
import type { Form } from "../types";

export default function FormPage() {
  const navigate = useNavigate();

  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchForms = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getForms();
      setForms(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Hapus form ini?");

    if (!confirmed) return;

    try {
      await deleteForm(id);
      await fetchForms();
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus form");
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const handleCopyLink = async (slug: string) => {
    const publicLink = `${window.location.origin}/public/forms/${slug}`;

    try {
      await navigator.clipboard.writeText(publicLink);
      alert("Link form berhasil disalin");
    } catch (error) {
      console.error(error);
      alert("Gagal menyalin link");
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Form Management</h1>
          <p className="text-sm text-gray-500">
            Kelola dynamic form di sistem TRACO
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchForms}
            className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-100"
          >
            Refresh
          </button>

          <button
            onClick={() => navigate("/forms/create")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Create Form
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <div className="text-gray-500">Loading forms...</div>
        </div>
      ) : forms.length === 0 ? (
        /* EMPTY */
        <div className="rounded-xl border border-dashed bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700">
            Belum ada form
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Buat form pertama untuk mulai menggunakan modul ini.
          </p>

          <button
            onClick={() => navigate("/forms/create")}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Buat Form
          </button>
        </div>
      ) : (
        /* LIST */
        <div className="grid gap-4">
          {forms.map((form) => (
            <div
              key={form.id}
              className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {form.name}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {form.description || "Tidak ada deskripsi"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        form.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {form.is_active ? "Active" : "Inactive"}
                    </span>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      {form.fields?.length || 0} Fields
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-gray-400">
                    Dibuat: {formatDate(form.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCopyLink(form.slug)}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Copy Link
                  </button>


                  <button
                    onClick={() => navigate(`/forms/${form.id}/responses`)}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Responses
                  </button>

                  <button
                    onClick={() => navigate(`/forms/${form.id}/edit`)}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(form.id)}
                    className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
