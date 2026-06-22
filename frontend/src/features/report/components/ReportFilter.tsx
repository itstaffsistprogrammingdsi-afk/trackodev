import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useMemo } from "react";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/
export type ReportFilterState = {
  start_date: string;
  end_date: string;
  search: string;
  label_ids: string[];
  brand_ids: string[];
};

type OptionItem = {
  id: string;
  name: string;
  color?: string;
};

type Props = {
  filter: ReportFilterState;
  setFilter: (value: ReportFilterState) => void;
  onSearch: () => void;

  labels?: OptionItem[];
  brands?: OptionItem[];
};

export default function ReportFilter({
  filter,
  setFilter,
  onSearch,
  labels = [],
  brands = [],
}: Props) {

  const startDate = useMemo<Date | null>(() => {
    return filter.start_date ? new Date(filter.start_date) : null;
  }, [filter.start_date]);

  const endDate = useMemo<Date | null>(() => {
    return filter.end_date ? new Date(filter.end_date) : null;
  }, [filter.end_date]);

  /*
  |--------------------------------------------------------------------------
  | TOGGLE FILTER (STRICT TYPED)
  |--------------------------------------------------------------------------
  */
  const toggleValue = (
    key: "label_ids" | "brand_ids",
    id: string
  ): void => {
    const exists = filter[key].includes(id);

    setFilter({
      ...filter,
      [key]: exists
        ? filter[key].filter((x: string) => x !== id)
        : [...filter[key], id],
    });
  };

  const clearFilter = (): void => {
    setFilter({
      start_date: "",
      end_date: "",
      search: "",
      label_ids: [],
      brand_ids: [],
    });
  };

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-4">

      {/* DATE + SEARCH */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

        <div>
          <label className="text-xs text-gray-500">Start Date</label>
          <DatePicker
            selected={startDate}
            onChange={(date: Date | null) =>
              setFilter({
                ...filter,
                start_date: date ? date.toISOString().split("T")[0] : "",
              })
            }
            className="w-full border rounded-lg p-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">End Date</label>
          <DatePicker
            selected={endDate}
            onChange={(date: Date | null) =>
              setFilter({
                ...filter,
                end_date: date ? date.toISOString().split("T")[0] : "",
              })
            }
            className="w-full border rounded-lg p-2 text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs text-gray-500">Search</label>
          <input
            value={filter.search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFilter({
                ...filter,
                search: e.target.value,
              })
            }
            placeholder="Search user / task..."
            className="w-full border rounded-lg p-2 text-sm"
          />
        </div>
      </div>

      {/* LABELS */}
      <div>
        <label className="text-xs text-gray-500 mb-2 block">
          Labels
        </label>

        <div className="flex flex-wrap gap-2">
          {labels.map((label: OptionItem) => {
            const active: boolean =
              filter.label_ids.includes(label.id);

            return (
              <button
                key={label.id}
                type="button"
                onClick={() =>
                  toggleValue("label_ids", label.id)
                }
                className={`px-3 py-1 rounded-full text-xs border transition
                  ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
              >
                {label.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* BRANDS */}
      <div>
        <label className="text-xs text-gray-500 mb-2 block">
          Brands
        </label>

        <div className="flex flex-wrap gap-2">
          {brands.map((brand: OptionItem) => {
            const active: boolean =
              filter.brand_ids.includes(brand.id);

            return (
              <button
                key={brand.id}
                type="button"
                onClick={() =>
                  toggleValue("brand_ids", brand.id)
                }
                className={`px-3 py-1 rounded-full text-xs border transition
                  ${
                    active
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
              >
                {brand.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={clearFilter}
          className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={onSearch}
          className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
        >
          Apply Filter
        </button>
      </div>
    </div>
  );
}