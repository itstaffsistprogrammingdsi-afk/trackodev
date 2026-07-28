export type DashboardPeriod = "day" | "week" | "month" | "year" | "all";

export type DashboardFilter = {
  period: DashboardPeriod;
  date: string;
  month: string;
  year: number;
  all_year: number | null;
};

export type DashboardFilterPayload = DashboardFilter & {
  start: string | null;
  end: string | null;
  label: string;
};

export const toDashboardParams = (filter: DashboardFilter) => ({
  period: filter.period,
  date: filter.date,
  month: filter.month,
  year: filter.year,
  all_year: filter.all_year ?? undefined,
});
