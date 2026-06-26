import { useMemo, useState } from "react";

import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import SearchBar from "../components/SearchBar";
import CategoryTabs from "../components/CategoryTabs";
import FormGrid from "../components/FormGrid";
import Footer from "../components/Footer";

import { usePublicForms } from "../hooks/usePublicForm";

export default function PublicFormCenterPage() {
  const { forms, loading } = usePublicForms();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");

  const categories = useMemo(() => {
    const items = forms
      .map((f) => f.publish_category)
      .filter(Boolean) as string[];

    return ["Semua", ...new Set(items)];
  }, [forms]);

  const filteredForms = useMemo(() => {
    return forms.filter((form) => {
      const matchSearch =
        form.name.toLowerCase().includes(search.toLowerCase()) ||
        (form.publish_description ?? "")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchCategory =
        category === "Semua" ||
        form.publish_category === category;

      return matchSearch && matchCategory;
    });
  }, [forms, search, category]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <Hero />

      <div className="mx-auto max-w-7xl px-4 py-10">
        <SearchBar
          value={search}
          onChange={setSearch}
        />

        <div className="mt-6">
          <CategoryTabs
            categories={categories}
            active={category}
            onChange={setCategory}
          />
        </div>

        <div className="mt-8">
          <FormGrid
            forms={filteredForms}
            loading={loading}
            publicMode
          />
        </div>
      </div>

      <Footer />
    </div>
  );
}