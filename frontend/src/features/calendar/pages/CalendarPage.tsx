import React from 'react';
import { CalendarView } from '../components/CalendarView';

const CalendarPage: React.FC = () => {
  return (
    <div className="mx-auto w-full space-y-5">
      {/* Anda bisa menambahkan Breadcrumb atau Header Halaman di sini jika diperlukan */}
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Workspace Calendar</h1>
      
      {/* Render Komponen Utama Kalender */}
      <CalendarView />
    </div>
  );
};

export default CalendarPage;