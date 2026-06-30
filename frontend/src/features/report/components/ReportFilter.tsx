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

  division_ids: string[];
  workspace_ids: string[];
  campaign_ids: string[];
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

  divisions?: OptionItem[];
  workspaces?: OptionItem[];
  campaigns?: OptionItem[];
  labels?: OptionItem[];
  brands?: OptionItem[];
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/
const formatDate = (date: Date): string => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function ReportFilter({
  filter,
  setFilter,
  onSearch,

  divisions = [],
  workspaces = [],
  campaigns = [],
  labels = [],
  brands = [],
}: Props) {



  const startDate = useMemo<Date | null>(() => {
    return filter.start_date
      ? new Date(filter.start_date)
      : null;
  }, [filter.start_date]);

  const endDate = useMemo<Date | null>(() => {
    return filter.end_date
      ? new Date(filter.end_date)
      : null;
  }, [filter.end_date]);

  /*
  |--------------------------------------------------------------------------
  | TOGGLE FILTER
  |--------------------------------------------------------------------------
  */
  const toggleValue = (
    key:
      | "division_ids"
      | "workspace_ids"
      | "campaign_ids"
      | "label_ids"
      | "brand_ids",
    id: string
  ): void => {
    const exists = filter[key].includes(id);

    setFilter({
      ...filter,
      [key]: exists
        ? filter[key].filter(
            (value: string) => value !== id
          )
        : [...filter[key], id],
    });
  };

  /*
  |--------------------------------------------------------------------------
  | RESET FILTER
  |--------------------------------------------------------------------------
  */
  const clearFilter = (): void => {
    setFilter({
      start_date: "",
      end_date: "",

      search: "",

      division_ids: [],
      workspace_ids: [],
      campaign_ids: [],
      label_ids: [],
      brand_ids: [],
    });
  };

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-5">
      {/* DATE + SEARCH */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-gray-500">
            Start Date
          </label>

          <DatePicker
            selected={startDate}
            dateFormat="yyyy-MM-dd"
            onChange={(date: Date | null) =>
              setFilter({
                ...filter,
                start_date: date
                  ? formatDate(date)
                  : "",
              })
            }
            className="w-full border rounded-lg p-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">
            End Date
          </label>

          <DatePicker
            selected={endDate}
            dateFormat="yyyy-MM-dd"
            onChange={(date: Date | null) =>
              setFilter({
                ...filter,
                end_date: date
                  ? formatDate(date)
                  : "",
              })
            }
            className="w-full border rounded-lg p-2 text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs text-gray-500">
            Search
          </label>

          <input
            type="text"
            value={filter.search}
            onChange={(e) =>
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

      {/* DIVISIONS */}
      <FilterSection
        title="Divisions"
        items={divisions}
        selected={filter.division_ids}
        activeClass="bg-purple-600 text-white border-purple-600"
        onToggle={(id) =>
          toggleValue("division_ids", id)
        }
      />

      {/* WORKSPACES */}
      <FilterSection
        title="Workspaces"
        items={workspaces}
        selected={filter.workspace_ids}
        activeClass="bg-indigo-600 text-white border-indigo-600"
        onToggle={(id) =>
          toggleValue("workspace_ids", id)
        }
      />

      {/* CAMPAIGNS */}
      <FilterSection
        title="Campaigns"
        items={campaigns}
        selected={filter.campaign_ids}
        activeClass="bg-orange-600 text-white border-orange-600"
        onToggle={(id) =>
          toggleValue("campaign_ids", id)
        }
      />

      {/* LABELS */}
      <FilterSection
        title="Labels"
        items={labels}
        selected={filter.label_ids}
        activeClass="bg-blue-600 text-white border-blue-600"
        onToggle={(id) =>
          toggleValue("label_ids", id)
        }
      />

      {/* BRANDS */}
      <FilterSection
        title="Brands"
        items={brands}
        selected={filter.brand_ids}
        activeClass="bg-green-600 text-white border-green-600"
        onToggle={(id) =>
          toggleValue("brand_ids", id)
        }
      />

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

/*
|--------------------------------------------------------------------------
| FILTER SECTION
|--------------------------------------------------------------------------
*/
type FilterSectionProps = {
  title: string;
  items: OptionItem[];
  selected: string[];
  activeClass: string;
  onToggle: (id: string) => void;
};

function FilterSection({
  title,
  items,
  selected,
  activeClass,
  onToggle,
}: FilterSectionProps) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-2 block">
        {title}
      </label>

      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = selected.includes(item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={`px-3 py-1 rounded-full text-xs border transition ${
                active
                  ? activeClass
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}