import React, { useState } from 'react';
import { useCalendar } from '../hooks/useCalendar';

const WEEK_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const CalendarView: React.FC = () => {
  const { currentMonth, data, loading, prevMonth, nextMonth, gridDays } = useCalendar();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Helper konversi nama bulan di header
  const formatHeaderMonth = (monthStr: string) => {
    if (!monthStr || !monthStr.includes('-')) return monthStr;
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  // Helper formatting label tanggal aman dari error Invalid Date
  const formatDateLabel = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const safeDateStr = dateStr.replace(' ', 'T'); 
    const date = new Date(safeDateStr);
    if (isNaN(date.getTime())) return 'Format Salah';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="w-full text-gray-800 font-sans select-none relative">
      
      {/* NAVIGASI HEADER KALENDER */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            {formatHeaderMonth(currentMonth)}
          </h2>
          {loading ? (
            <span className="text-xs text-blue-600 animate-pulse font-medium">Menyelaraskan data...</span>
          ) : (
            <div className="bg-gray-100 text-xs px-2.5 py-1 rounded-full text-gray-600 font-semibold">
              {data?.summary?.total_tasks || 0} Cards Terdaftar
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button onClick={prevMonth} className="px-3 py-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all text-sm font-medium text-gray-700">Prev</button>
          <button onClick={nextMonth} className="px-3 py-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all text-sm font-medium text-gray-700">Next</button>
        </div>
      </div>

      {/* STRUKTUR GRID UTAMA (WHITE THEME) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        
        {/* BARIS NAMA HARI */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/70">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="text-center py-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* MATRIKS KOTAK HARI */}
        <div className="grid grid-cols-7 auto-rows-[170px] bg-gray-200 gap-[1px]">
          {gridDays.map((cell, idx) => {
            const dayData = data && data.days ? data.days[cell.dateString] : null;
            const tasks = dayData && Array.isArray(dayData.tasks) ? dayData.tasks : [];
            const totalTasksOnDay = dayData ? dayData.total : 0;
            const isToday = cell.dateString === new Date().toISOString().split('T')[0];

            return (
              <div 
                key={`${cell.dateString}-${idx}`} 
                onClick={() => totalTasksOnDay > 0 && setSelectedDate(cell.dateString)}
                className={`p-2 transition-all flex flex-col justify-between h-[170px] max-h-[170px] ${
                  cell.isCurrentMonth ? (isToday ? 'bg-blue-50/40' : 'bg-white') : 'bg-gray-50 text-gray-400 opacity-60'
                } hover:bg-gray-50/80 cursor-pointer overflow-hidden relative group`}
              >
                {/* Atas: Angka Tanggal */}
                <div className="flex justify-between items-center mb-1.5 flex-shrink-0">
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700'
                  }`}>
                    {cell.dayNumber}
                  </span>
                  {totalTasksOnDay > 0 && (
                    <span className="text-[10px] text-gray-500 bg-gray-100 group-hover:bg-gray-200 px-1.5 py-0.5 rounded font-medium transition-colors">
                      {totalTasksOnDay} Card
                    </span>
                  )}
                </div>

{/* 🚀 GANTI SELURUH ISI KONTAINER LIST TASK (tasks.map) DENGAN KODE ESTETIK INI */}
<div className="flex-1 overflow-y-auto space-y-1 my-1 pr-0.5 max-h-[110px] scrollbar-none overflow-x-hidden">
  {tasks.map((task: any) => {
    
    // 🗓️ Ekstrak murni tanggal (YYYY-MM-DD)
    const startDateStr = task.created_at ? task.created_at.split(' ')[0] : null;
    const endDateStr = task.due_date ? task.due_date.split(' ')[0] : null;
    const currentCellDate = cell.dateString;

    // Evaluasi posisi cell terhadap rentang tanggal
    const isStart = currentCellDate === startDateStr;
    const isEnd = currentCellDate === endDateStr;
    const isBetween = startDateStr && endDateStr && currentCellDate > startDateStr && currentCellDate < endDateStr;
    const isRange = isStart || isEnd || isBetween;

    // 🎨 Palet warna pastel Trello Modern (Lebih soft di mata, tidak bikin pusing)
    const colorThemes = [
      'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200',
      'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200',
      'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200',
    ];
    const chosenColor = colorThemes[(task.campaign_id || task.id) % colorThemes.length];

    return (
      <div 
        key={task.id}
        className={`text-[11px] px-2 py-1 transition-all flex items-center justify-between relative group select-none h-6 min-h-[24px]
          ${isRange ? chosenColor : 'bg-gray-50 border border-gray-200 text-gray-700 rounded-md'}
          ${isRange && isStart ? 'rounded-l-md ml-0.5 border-l border-y border-r-0 font-medium' : ''}
          ${isRange && isEnd ? 'rounded-r-md mr-0.5 border-r border-y border-l-0 font-medium' : ''}
          ${isRange && isBetween ? 'rounded-none mx-0 border-y border-x-0 opacity-95' : ''}
        `}
        title={`${task.title} (${startDateStr} s/d ${endDateStr})`}
      >
{/* Kontainer Judul + Icon Status Bulat Menyala */}
<div className="flex items-center space-x-1.5 truncate w-full pr-1">
  
  {/* Indikator Bulat Menyala untuk Start Date (Biru/Indigo) */}
  {isStart && (
    <span className="relative flex h-2 w-2 flex-shrink-0" title="Start Date">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
    </span>
  )}

  {/* Indikator Bulat Menyala untuk Due Date (Hijau jika Selesai, Merah jika Overdue/Pending) */}
  {isEnd && (
    <span className="relative flex h-2 w-2 flex-shrink-0" title="Due Date">
      {/* Efek radar gelombang di latar belakang */}
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
        ${task.status === 'completed' || task.status === 'done' ? 'bg-emerald-400' : 'bg-rose-400'}
      `}></span>
      
      {/* Bulatan inti di bagian depan */}
      <span className={`relative inline-flex rounded-full h-2 w-2
        ${task.status === 'completed' || task.status === 'done' ? 'bg-emerald-500' : 'bg-rose-500'}
      `}></span>
    </span>
  )}

  {/* Kontainer Nama Campaign + Judul Task */}
  <div className="flex items-center space-x-1 truncate text-[11px] w-full">
    {/* 🏷️ Nama Campaign (Hanya dirender jika data campaign tersedia) */}
    {isStart && task.campaign?.name && (
      <span className="font-semibold uppercase tracking-wider text-[9px] opacity-75 bg-black/5 px-1 py-0.5 rounded flex-shrink-0 text-gray-600">
        {task.campaign.name}
      </span>
    )}
    
    {/* 📝 Teks Judul Task Utama */}
    <span className="truncate font-bold tracking-tight text-gray-700 group-hover:text-gray-900 transition-colors">
      {task.title}
    </span>
  </div>

</div>
        
        {/* 👤 Avatar Handler Kecil di Ujung Kanan (Hanya muncul di tanggal akhir/single card agar rapi) */}
        {!isBetween && !isStart && task.assignees && task.assignees.length > 0 && (
          <div className="flex-shrink-0 ml-1">
            <div 
              className="w-3.5 h-3.5 rounded-full bg-white text-gray-700 border border-current flex items-center justify-center font-bold text-[7px]"
              title={`Pekerja: ${task.assignees[0].name}`}
            >
              {task.assignees[0].name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    );
  })}
</div>

                {/* Bawah: Tombol indikator jika card melimpah */}
                {totalTasksOnDay > 3 && (
                  <div className="text-[10px] text-blue-600 font-bold text-left pt-1 mt-auto bg-white border-t border-gray-100 hover:text-blue-700">
                    + {totalTasksOnDay - 3} lainnya...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* POP-OVER LIGHTBOX MODAL DETAIL */}
      {selectedDate && data?.days[selectedDate] && (
        <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl border border-gray-200 flex flex-col max-h-[80vh] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-base font-bold text-gray-900">Agenda Hari {formatDateLabel(selectedDate)}</h3>
                <p className="text-xs text-gray-500">Memuat {data.days[selectedDate].total} aktivitas tim</p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="text-gray-500 hover:text-gray-700 bg-gray-200/60 p-1.5 rounded-lg text-xs font-semibold px-3">
                Tutup
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-white">
              {data.days[selectedDate].tasks.map((task: any) => (
                <div key={task.id} className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col gap-2">
                  <div className="font-bold text-sm text-gray-900">{task.title}</div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex gap-2">
                      <span className="text-gray-500">📅 Dibuat: <span className="text-gray-700 font-medium">{new Date(task.created_at.replace(' ', 'T')).toLocaleDateString('id-ID')}</span></span>
                      <span className="bg-blue-50 text-blue-700 px-1.5 rounded">
                        ⏳ Batas: {new Date(task.due_date.replace(' ', 'T')).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-gray-200">
                      <span className="text-[10px] text-gray-400">Pekerja:</span>
                      {task.assignees && task.assignees.length > 0 ? (
                        task.assignees.map((user: any) => (
                          <span key={user.id} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                            {user.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Belum ada</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};