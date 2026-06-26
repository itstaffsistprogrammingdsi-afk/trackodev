import { Search } from "lucide-react";

type Props = {
  search: string;
  setSearch: (v: string) => void;

  filter: "all" | "published" | "draft";
  setFilter: (v: "all" | "published" | "draft") => void;
};

export default function FormToolbar({
  search,
  setSearch,
  filter,
  setFilter,
}: Props) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* Filter */}
      <div className="order-2 flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm md:order-1">
        {[
          ["all", "All"],
          ["published", "Published"],
          ["draft", "Draft"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() =>
              setFilter(value as "all" | "published" | "draft")
            }
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filter === value
                ? "bg-indigo-600 text-white shadow"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="order-1 relative w-full md:order-2 md:max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search forms..."
          className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>
    </div>
  );
}