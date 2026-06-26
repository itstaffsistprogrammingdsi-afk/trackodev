import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function SearchBar({
  value,
  onChange,
}: Props) {
  return (
    <div className="relative">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search forms..."
        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 shadow-sm outline-none transition focus:border-indigo-500"
      />
    </div>
  );
}