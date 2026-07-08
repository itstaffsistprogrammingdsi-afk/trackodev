import React, { useState } from 'react';
import { useReport } from '../hooks/useReport';
import { UserList } from '../components/UserList';
import { CardDetail } from '../components/CardDetail';
import { ReportPreviewModal } from '../components/ReportPreviewModal';

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
    loadingPreview,
    exporting,
    previewData,
    updateFilter,
    handleQcSubmit,
    handleExport,
    handlePreview,
    clearPreview,
    handleBypassUser, // Ekstrak fungsi bypass dari useReport
  } = useReport();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handlePreviewClick = async (userId?: string | number) => {
    const result = await handlePreview(userId);
    if (result) {
      setIsPreviewOpen(true);
    }
  };

  const handleDownloadFromPreview = () => {
    if (previewData) {
      handleExport('pdf', selectedUser?.id);
    }
  };

  const handleExportExcelFromPreview = () => {
    handleExport('excel', selectedUser?.id);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6 lg:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
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
          onPreview={handlePreviewClick}
          previewLoading={loadingPreview}
          exporting={exporting}
          onImpersonate={handleBypassUser} // Kirim props onImpersonate ke UserList
        />

        {/* Preview Modal */}
        <ReportPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            clearPreview();
          }}
          onDownload={handleDownloadFromPreview}
          onExportExcel={handleExportExcelFromPreview}
          previewData={previewData}
          loading={loadingPreview}
          title={selectedUser ? `Preview Laporan - ${selectedUser.name}` : 'Preview Laporan Batch'}
        />

        {/* Card Detail Modal */}
        {selectedUser && (
          <CardDetail
            selectedUser={selectedUser}
            cards={cards}
            loading={loadingCards}
            onQcSubmit={handleQcSubmit}
            onClose={() => setSelectedUser(null)}
            onExport={handleExport}
            onPreview={handlePreviewClick}
            exporting={exporting}
          />
        )}
        
      </div>
    </div>
  );
};

export default ReportPage;