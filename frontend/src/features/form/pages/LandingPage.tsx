import { useMemo, useState } from "react";

import { usePublicForms } from "../hooks/usePublicForm";

import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import SearchBar from "../components/SearchBar";
import CategoryTabs from "../components/CategoryTabs";
import FormGrid from "../components/FormGrid";
import EmptyState from "../components/EmptyState";
import Footer from "../components/Footer";

export default function LandingPage() {
  const { forms, loading, error } = usePublicForms();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  // =========================
  // CATEGORY
  // =========================

  const categories = useMemo(() => {
    const list = Array.from(
      new Set(
        forms
          .map((f) => f.publish_category || "General")
          .filter(Boolean)
      )
    );

    return ["All", ...list];
  }, [forms]);

  // =========================
  // FILTER
  // =========================

  const filteredForms = useMemo(() => {
    return forms.filter((form) => {
      const keyword = search.toLowerCase();

      const matchSearch =
        form.name.toLowerCase().includes(keyword) ||
        (form.publish_description ?? "")
          .toLowerCase()
          .includes(keyword);

      const matchCategory =
        category === "All"
          ? true
          : form.publish_category === category;

      return matchSearch && matchCategory;
    });
  }, [forms, search, category]);

  return (
    <div className="min-h-screen bg-slate-50">

      <Navbar />

      <Hero />

      <main
  id="forms"
  className="mx-auto max-w-7xl px-6 py-10"
>

        <div className="space-y-6">

          <SearchBar
            value={search}
            onChange={setSearch}
          />

          <CategoryTabs
            categories={categories}
            active={category}
            onChange={setCategory}
          />

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
              {error}
            </div>
          )}

          {loading ? (

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-2xl bg-white"
                />
              ))}
            </div>

          ) : filteredForms.length === 0 ? (

            <EmptyState />

          ) : (

            <FormGrid forms={filteredForms} />

          )}

        </div>

      </main>

      <Footer />

    </div>
  );
}