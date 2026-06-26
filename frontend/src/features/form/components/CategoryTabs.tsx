type Props = {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
};

export default function CategoryTabs({
  categories,
  active,
  onChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onChange(category)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            active === category
              ? "bg-indigo-600 text-white"
              : "border border-slate-200 bg-white hover:bg-slate-100"
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}