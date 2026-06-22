type ReportFilterState = {
  start_date: string;
  end_date: string;
};

type Props = {
  filter: ReportFilterState;
  setFilter: (value: ReportFilterState) => void;
  onSearch: () => void;
};

export default function ReportFilter({
  filter,
  setFilter,
  onSearch,
}: Props) {
  return (
    <div className="flex gap-2">
      <input
        type="date"
        value={filter.start_date}
        onChange={(e) =>
          setFilter({
            ...filter,
            start_date: e.target.value,
          })
        }
        className="border p-2"
      />

      <input
        type="date"
        value={filter.end_date}
        onChange={(e) =>
          setFilter({
            ...filter,
            end_date: e.target.value,
          })
        }
        className="border p-2"
      />

      <button
        onClick={onSearch}
        className="bg-blue-500 text-white px-4"
      >
        Search
      </button>
    </div>
  );
}