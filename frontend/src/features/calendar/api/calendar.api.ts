// 1. Import instance 'api' yang sudah memiliki interceptor token dari folder lib
import api from '../../../lib/axios'; 
import {
  CalendarBoardOption,
  CalendarMonthResponse,
  CalendarDayResponse,
} from '../types';

export const calendarApi = {
  // Ambil data bulanan
  getMonthData: async (month?: string): Promise<CalendarMonthResponse> => {
    const response = await api.get<CalendarMonthResponse>('/calendar', {
      params: month ? { month } : {},
    });
    return response.data;
  },

  // Ambil data detail per hari jika diklik
  getDayDetail: async (date: string): Promise<CalendarDayResponse> => {
    const response = await api.get<CalendarDayResponse>(`/calendar/${date}`);
    return response.data;
  },

  getCreateOptions: async (): Promise<CalendarBoardOption[]> => {
    const response = await api.get<{ data: CalendarBoardOption[] }>(
      '/calendar/create-options',
    );
    return response.data.data;
  },
};
