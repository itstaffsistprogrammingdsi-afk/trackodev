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
    masterData,
    loadingUsers,
    loadingCards,
    updateFilter,
    handleQcSubmit,
    handleExport,
  } = useReport();

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6 lg:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Halaman Utama: Menampilkan Filter & Grid User */}
        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
          filters={filters}
          onFilterChange={updateFilter}
          pagination={pagination}
          loading={loadingUsers}
          masterData={masterData} 
          onExport={handleExport}
        />

        {/* Modal / Slide-over Drawer: Muncul jika ada user yang diklik */}
        {selectedUser && (
          <CardDetail
            selectedUser={selectedUser}
            cards={cards}
            loading={loadingCards}
            onQcSubmit={handleQcSubmit}
            onClose={() => setSelectedUser(null)}
            onExport={handleExport}
          />
        )}
        
      </div>
    </div>
  );
};

export default ReportPage;