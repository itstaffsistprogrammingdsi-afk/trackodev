import React from 'react';
import { useReport } from '../hooks/useReport';
import { UserList } from '../components/UserList';
import { CardDetail } from '../components/CardDetail';

export const ReportPage: React.FC = () => {
  const {
    users,
    pagination,
    selectedUser,
    setSelectedUser,
    cards,
    filters,
    masterData, // Mengambil data riil dari database
    loadingUsers,
    loadingCards,
    updateFilter,
    handleQcSubmit,
  } = useReport();

  return (
    <div className="flex w-full h-screen bg-gray-100 overflow-hidden">
      {/* PANEL KIRI: Mengirim data filter database secara langsung */}
      <UserList
        users={users}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        filters={filters}
        onFilterChange={updateFilter}
        pagination={pagination}
        loading={loadingUsers}
        masterData={masterData} 
      />

      {/* PANEL KANAN: Workspace Detail & Evaluasi Tindakan QC */}
      <CardDetail
        selectedUser={selectedUser}
        cards={cards}
        loading={loadingCards}
        onQcSubmit={handleQcSubmit}
      />
    </div>
  );
};

export default ReportPage;