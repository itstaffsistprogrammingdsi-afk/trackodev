import React from 'react';
import { CalendarView } from '../components/CalendarView';

const CalendarPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6 px-4">
      {/* Anda bisa menambahkan Breadcrumb atau Header Halaman di sini jika diperlukan */}
      <h1 className="text-2xl font-bold text-white mb-6">Workspace Calendar</h1>
      
      {/* Render Komponen Utama Kalender */}
      <CalendarView />
    </div>
  );
};

export default CalendarPage;