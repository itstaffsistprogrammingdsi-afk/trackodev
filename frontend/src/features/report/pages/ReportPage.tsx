import React, { useState } from 'react';
import { useReport } from '../hooks/useReport';
import { UserList } from '../components/UserList';
import { CardDetail } from '../components/CardDetail';
import { ReportPreviewModal } from '../components/ReportPreviewModal';
import { SecureExportDialog } from '../components/SecureExportDialog';
import { generateExportPassword } from '@/lib/exportSecurity';

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
  const [pendingExport, setPendingExport] = useState<{ format: 'pdf' | 'excel'; userId?: string | number } | null>(null);
  const [exportPassword, setExportPassword] = useState(() => generateExportPassword());


  const handlePreviewClick = async (userId?: string | number) => {
    const result = await handlePreview(userId);
    if (result) {
      setIsPreviewOpen(true);
    }
  };

  const requestSecureExport = (format: 'pdf' | 'excel', userId?: string | number) => {
    setExportPassword(generateExportPassword());
    setPendingExport({ format, userId });
  };

  const confirmSecureExport = async () => {
    if (!pendingExport) return;

    const success = await handleExport(
      pendingExport.format,
      pendingExport.userId,
      exportPassword,
    );
    if (success) setPendingExport(null);
  };
  const handleDownloadFromPreview = () => {
    if (previewData) {
      requestSecureExport('pdf', selectedUser?.id);
    }
  };

  const handleExportExcelFromPreview = () => {
    requestSecureExport('excel', selectedUser?.id);
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
          onExport={requestSecureExport}
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
            onExport={requestSecureExport}
            onPreview={handlePreviewClick}
            exporting={exporting}
          />
        )}
        

        <SecureExportDialog
          open={pendingExport !== null}
          format={pendingExport?.format ?? 'pdf'}
          password={exportPassword}
          loading={exporting}
          onPasswordChange={setExportPassword}
          onRegenerate={() => setExportPassword(generateExportPassword())}
          onClose={() => setPendingExport(null)}
          onConfirm={confirmSecureExport}
        />

      </div>
    </div>
  );
};

export default ReportPage;