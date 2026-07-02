import { useState, useEffect, useCallback } from "react";
import { calendarApi } from "../api/calendar.api";
import { CalendarMonthResponse } from "../types";

export function useCalendar() {
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [data, setData] = useState<CalendarMonthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Bungkus fungsi fetch ke dalam useCallback agar bisa dipanggil berulang kali
  const fetchCalendarData = useCallback((monthStr: string) => {
    setLoading(true);
    calendarApi
      .getMonthData(monthStr)
      .then((res) => {
        setData(res);
      })
      .catch(() => {
        setData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchCalendarData(currentMonth);
  }, [currentMonth, fetchCalendarData]);

  const nextMonth = () => {
    const [year, month] = currentMonth.split("-").map(Number);
    const nextDate = new Date(year, month, 1);
    setCurrentMonth(
      `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  const prevMonth = () => {
    const [year, month] = currentMonth.split("-").map(Number);
    const prevDate = new Date(year, month - 2, 1);
    setCurrentMonth(
      `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  const generateGridDays = () => {
    const [year, monthNum] = currentMonth.split("-").map(Number);
    const firstDayOfMonth = new Date(year, monthNum - 1, 1);
    const lastDayOfMonth = new Date(year, monthNum, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();

    const grid = [];

    // Padding Bulan Sebelumnya
    const prevMonthLastDay = new Date(year, monthNum - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pMonth = monthNum === 1 ? 12 : monthNum - 1;
      const pYear = monthNum === 1 ? year - 1 : year;
      grid.push({
        dateString: `${pYear}-${String(pMonth).padStart(2, "0")}-${String(prevMonthLastDay - i).padStart(2, "0")}`,
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
      });
    }

    // Bulan Sekarang
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push({
        dateString: `${year}-${String(monthNum).padStart(2, "0")}-${String(i).padStart(2, "0")}`,
        dayNumber: i,
        isCurrentMonth: true,
      });
    }

    // Padding Bulan Berikutnya
    const totalSlots = grid.length > 35 ? 42 : 35;
    const nextMonthPadding = totalSlots - grid.length;
    for (let i = 1; i <= nextMonthPadding; i++) {
      const nMonth = monthNum === 12 ? 1 : monthNum + 1;
      const nYear = monthNum === 12 ? year + 1 : year;
      grid.push({
        dateString: `${nYear}-${String(nMonth).padStart(2, "0")}-${String(i).padStart(2, "0")}`,
        dayNumber: i,
        isCurrentMonth: false,
      });
    }

    return grid;
  };

  return {
    currentMonth,
    data,
    loading,
    nextMonth,
    prevMonth,
    gridDays: generateGridDays(),
    refresh: () => fetchCalendarData(currentMonth), // Expose fungsi ini ke komponen
  };
}
