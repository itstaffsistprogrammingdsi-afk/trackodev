import React, { useState } from 'react';
import { useCalendar } from '../hooks/useCalendar';

// --- TYPE DEFINITIONS ---
interface Assignee {
  id: string | number;
  name: string;
}

interface Campaign {
  id: string | number;
  name: string;
}

interface Task {
  id: string | number;
  title: string;
  status: string;
  created_at?: string;
  due_date?: string;
  campaign?: Campaign;
  assignees?: Assignee[];
}

interface LocalDayData {
  date?: string;
  total: number;
  tasks: Task[];
}

interface GridDayCell {
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
}

// Data yang dikembalikan oleh useCalendar
interface CalendarData {
  days: LocalDayData[] | Record<string, LocalDayData>;
  summary?: {
    total_tasks: number;
  };
}

// --- CONSTANTS ---
const WEEK_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const CalendarView: React.FC = () => {
  const { currentMonth, data, loading, prevMonth, nextMonth, gridDays } = useCalendar();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // State untuk tooltip
  const [hoveredTask, setHoveredTask] = useState<{ task: Task; rect: DOMRect } | null>(null);

  // --- FORMATTERS ---
  const formatHeaderMonth = (monthStr: string) => {
    if (!monthStr || !monthStr.includes('-')) return monthStr;
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  const formatDateLabel = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const safeDateStr = dateStr.replace(' ', 'T');
    const date = new Date(safeDateStr);
    if (isNaN(date.getTime())) return 'Format Salah';
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '-';
    }
  };

  // --- DATA HANDLER ---
  const getDayData = (dateStr: string): LocalDayData | null => {
    if (!data || !data.days) return null;
    if (Array.isArray(data.days)) {
      return data.days.find((d: LocalDayData) => d.date === dateStr) || null;
    }
    return (data.days as Record<string, LocalDayData>)[dateStr] || null;
  };

  const selectedDayData = selectedDate ? getDayData(selectedDate) : null;
  const calendarData = data as CalendarData | null;
  const totalTasks = calendarData?.summary?.total_tasks || 0;

  return (
    <div className="w-full text-slate-800 font-sans select-none relative max-w-7xl mx-auto">
      
      {/* --- HEADER NAVBAR --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatHeaderMonth(currentMonth)}
          </h2>
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
              <span className="text-xs font-medium text-slate-600">Sinkronisasi...</span>
            </div>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200">
              {totalTasks} Tasks
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white ring-1 ring-slate-200 rounded-md shadow-sm overflow-hidden">
            <button 
              onClick={prevMonth} 
              className="p-2 hover:bg-slate-50 text-slate-600 transition-colors focus:outline-none"
              title="Bulan Sebelumnya"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button 
              onClick={nextMonth} 
              className="p-2 hover:bg-slate-50 text-slate-600 transition-colors focus:outline-none"
              title="Bulan Berikutnya"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* --- CALENDAR GRID --- */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        
        {/* Header Hari */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="text-right py-3 pr-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {day}
            </div>
          ))}
        </div>

        {/* Matriks Kotak */}
        <div className="grid grid-cols-7 auto-rows-[160px] bg-slate-50 gap-px">
          {gridDays.map((cell: GridDayCell, idx: number) => {
            const dayData = getDayData(cell.dateString);
            const tasks = dayData && Array.isArray(dayData.tasks) ? dayData.tasks : [];
            const totalTasksOnDay = dayData ? dayData.total : 0;
            const isToday = cell.dateString === new Date().toISOString().split('T')[0];

            return (
              <div 
                key={`${cell.dateString}-${idx}`} 
                onClick={() => totalTasksOnDay > 0 && setSelectedDate(cell.dateString)}
                className={`flex flex-col p-2.5 transition-colors h-[160px] ${
                  cell.isCurrentMonth 
                    ? (isToday ? 'bg-indigo-50/30 hover:bg-indigo-50/60' : 'bg-white hover:bg-slate-50') 
                    : 'bg-slate-50/50 text-slate-400 hover:bg-slate-100/50'
                } ${totalTasksOnDay > 0 ? 'cursor-pointer' : 'cursor-default'} group`}
              >
                {/* Tanggal */}
                <div className="flex justify-between items-center mb-3">
                  <span className="flex-1" />
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                    isToday ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-700 group-hover:bg-slate-200'
                  } ${!cell.isCurrentMonth && !isToday && 'text-slate-400'}`}>
                    {cell.dayNumber}
                  </span>
                </div>

                {/* List Tasks (maksimal 3) */}
                <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-none">
                  {tasks.slice(0, 3).map((task: Task) => {
                    const isCompleted = task.status === 'completed' || task.status === 'done';

                    return (
                      <div 
                        key={task.id}
                        className={`group/task flex items-center gap-2 px-2 py-1.5 rounded-md transition-all border ${
                          isCompleted 
                            ? 'border-transparent opacity-60 hover:opacity-100' 
                            : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                        }`}
                        title={task.title}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredTask({ task, rect });
                        }}
                        onMouseLeave={() => setHoveredTask(null)}
                      >
                        {/* Status Icon */}
                        <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-[3px] border ${
                          isCompleted 
                            ? 'bg-emerald-500 border-emerald-600' 
                            : 'bg-amber-400 border-amber-500'
                        }`} />
                        
                        {/* Judul */}
                        <span className={`truncate text-xs font-medium ${
                          isCompleted ? 'text-slate-500 line-through' : 'text-slate-700'
                        }`}>
                          {task.title}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Indikator Overflow */}
                {totalTasksOnDay > 3 && (
                  <div className="mt-1 text-[10px] font-semibold text-slate-400 text-center pt-1 border-t border-slate-100">
                    +{totalTasksOnDay - 3} lainnya
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODAL DIALOG (tetap) --- */}
      {selectedDate && selectedDayData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="absolute inset-0" onClick={() => setSelectedDate(null)} />
          
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-white">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{formatDateLabel(selectedDate)}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded">
                    {selectedDayData.total}
                  </span>
                  <span className="text-sm font-medium text-slate-500">Tasks dijadwalkan</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDate(null)} 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-3">
              {selectedDayData.tasks.map((task: Task) => (
                <div 
                  key={task.id} 
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-xl ring-1 ring-slate-200 hover:ring-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3 overflow-hidden">
                    <div className="pt-1">
                      <div className={`w-3.5 h-3.5 rounded-[4px] border-2 ${
                        task.status === 'completed' || task.status === 'done'
                          ? 'bg-emerald-500 border-emerald-600' 
                          : 'bg-white border-slate-300'
                      }`} />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 truncate pr-4">
                        {task.title}
                      </h4>
                      {task.campaign?.name && (
                        <div className="flex items-center">
                          <span className="text-[10px] font-bold tracking-wide uppercase text-slate-500 flex items-center gap-1">
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            {task.campaign.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full pt-3 sm:pt-0 border-t sm:border-0 border-slate-100">
                    
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {task.due_date ? new Date(task.due_date.replace(' ', 'T')).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }) : '-'}
                    </div>

                    <div className="flex items-center">
                      {task.assignees && task.assignees.length > 0 ? (
                        <div className="flex -space-x-2">
                          {task.assignees.slice(0, 3).map((user: Assignee) => (
                            <div 
                              key={user.id} 
                              className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 ring-2 ring-white flex items-center justify-center text-[10px] font-bold"
                              title={user.name}
                            >
                              {user.name.substring(0, 2).toUpperCase()}
                            </div>
                          ))}
                          {task.assignees.length > 3 && (
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 ring-2 ring-white flex items-center justify-center text-[10px] font-bold">
                              +{task.assignees.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-50 ring-2 ring-white border border-dashed border-slate-300 flex items-center justify-center text-slate-400" title="Unassigned">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* --- TOOLTIP --- */}
      {hoveredTask && (
        <div
          className="fixed z-[100] bg-slate-300 text-gray-700 text-xs rounded-lg shadow-xl p-3 max-w-xs pointer-events-none transition-opacity duration-150"
          style={{
            left: hoveredTask.rect.left + hoveredTask.rect.width / 2,
            top: hoveredTask.rect.top - 10,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex flex-col gap-1.5">
            <div className="font-semibold text-gray-700 border-b border-slate-600 pb-1 mb-0.5">
              {hoveredTask.task.title}
            </div>
            <div>
              <span className="font-medium text-gray-700"></span>{' '}
              {formatShortDate(hoveredTask.task.created_at)}{' '} -
              <span className="font-medium text-gray-700"></span>{' '}
              {formatShortDate(hoveredTask.task.due_date)}
            </div>
            <div>
              <span className="font-medium text-gray-700">Campaign / Project:</span>{' '}
              {hoveredTask.task.campaign?.name || '-'}
            </div>
          </div>
          {/* Segitiga penunjuk */}
          <div
            className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full border-8 border-transparent border-t-slate-800"
          />
        </div>
      )}

    </div>
  );
};