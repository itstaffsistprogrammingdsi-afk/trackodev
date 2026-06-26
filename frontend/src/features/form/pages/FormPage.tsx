import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  getForms,
  deleteForm,
} from "../api/form.api";

import type { Form } from "../types";

import FormStats from "../components/FormStats";
import FormToolbar from "../components/FormToolbar";
import FormCard from "../components/FormCard";
import { usePublishForm } from "../hooks/usePublishForm";

export default function FormPage() {
  const navigate = useNavigate();

  // ===============================
  // STATE
  // ===============================

  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<
    "all" | "published" | "draft"
  >("all");

  // ===============================
  // LOAD DATA
  // ===============================

  const fetchForms = useCallback(async () => {
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
  }, []);

  // ===============================
  // DELETE
  // ===============================

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Hapus form ini?")) return;

      try {
        await deleteForm(id);

        fetchForms();
      } catch (err) {
        console.error(err);
        alert("Gagal menghapus form");
      }
    },
    [fetchForms],
  );

  // ===============================
  // COPY LINK
  // ===============================

  const handleCopyLink = useCallback(
    async (slug: string) => {
      try {
        await navigator.clipboard.writeText(
          `${window.location.origin}/public/forms/${slug}`,
        );

        alert("Link berhasil disalin.");
      } catch (err) {
        console.error(err);
        alert("Gagal menyalin link.");
      }
    },
    [],
  );

  // ===============================
  // PUBLISH
  // ===============================

const { publish } = usePublishForm(fetchForms);

  // ===============================
  // FILTER
  // ===============================

  const filteredForms = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return forms.filter((form) => {
      const matchSearch =
        form.name.toLowerCase().includes(keyword) ||
        (form.description ?? "")
          .toLowerCase()
          .includes(keyword);

      const matchFilter =
        filter === "all"
          ? true
          : filter === "published"
          ? form.is_published
          : !form.is_published;

      return matchSearch && matchFilter;
    });
  }, [forms, search, filter]);

  // ===============================
  // INIT
  // ===============================

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-5 p-6">

        {/* HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Form Builder
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Build, publish and manage dynamic forms.
            </p>
          </div>

          <div className="flex gap-3">

            <button
              onClick={fetchForms}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-medium transition hover:bg-slate-100"
            >
              Refresh
            </button>

            <button
              onClick={() => navigate("/forms/create")}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white shadow hover:bg-indigo-700"
            >
              + New Form
            </button>

          </div>

        </div>

        {/* STATS */}

        <FormStats forms={forms} />

        {/* TOOLBAR */}

        <FormToolbar
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
        />

        {/* ERROR */}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* LOADING */}

        {loading ? (

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">

            {Array.from({ length: 6 }).map((_, i) => (

              <div
                key={i}
                className="overflow-hidden rounded-3xl border bg-white p-6 shadow-sm"
              >

                <div className="mb-5 h-5 w-2/3 animate-pulse rounded bg-slate-200" />

                <div className="mb-6 h-3 w-full animate-pulse rounded bg-slate-100" />

                <div className="grid grid-cols-2 gap-3">

                  <div className="h-16 animate-pulse rounded-xl bg-slate-100" />

                  <div className="h-16 animate-pulse rounded-xl bg-slate-100" />

                </div>

                <div className="mt-8 flex gap-2">

                  {Array.from({ length: 5 }).map((_, j) => (
                    <div
                      key={j}
                      className="h-11 flex-1 animate-pulse rounded-xl bg-slate-100"
                    />
                  ))}

                </div>

              </div>

            ))}

          </div>

        ) : filteredForms.length === 0 ? (

          <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-20 text-center shadow-sm">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-4xl">
              📄
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-800">
              No Forms Found
            </h2>

            <p className="mt-2 text-slate-500">
              Create your first form to start collecting data.
            </p>

            <button
              onClick={() => navigate("/forms/create")}
              className="mt-8 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Create Form
            </button>

          </div>

        ) : (

          <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">

            {filteredForms.map((form) => (

              <FormCard
                key={form.id}
                form={form}
                onCopy={handleCopyLink}
                onDelete={handleDelete}
                onPublish={publish}
                onEdit={(id) =>
                  navigate(`/forms/${id}/edit`)
                }
                onResponses={(id) =>
                  navigate(`/forms/${id}/responses`)
                }
              />

            ))}

          </div>

        )}

      </div>
    </div>
  );
}