import React, { useState } from 'react';
import { useReport } from '../hooks/useReport';
import { UserList } from '../components/UserList';
import { CardDetail } from '../components/CardDetail';
import { ReportPreviewModal } from '../components/ReportPreviewModal';
import ReportSummaryCards from '../components/ReportSummaryCards';
import { ReportDownloadHistoryModal } from '../components/ReportDownloadHistoryModal';
import { SecureExportDialog } from '../components/SecureExportDialog';
import { generateExportPassword } from '@/lib/exportSecurity';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

export const ReportPage: React.FC = () => {
  const { t } = useLanguage();
  const { can } = useAuth();
  const {
    users,
    pagination,
    selectedUser,
    setSelectedUser,
    cards,
    filters,
    masterData,
    filterOptionsError,
    reloadFilterOptions,
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
  const [previewUser, setPreviewUser] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [pendingExport, setPendingExport] = useState<{ format: 'pdf' | 'excel'; userId?: string | number } | null>(null);
  const [exportPassword, setExportPassword] = useState("");
  const [isDownloadHistoryOpen, setIsDownloadHistoryOpen] = useState(false);
  const canViewDownloadHistory = can("report.activity.view");


  const handlePreviewClick = async (userId?: string | number) => {
    if (userId === undefined || userId === null || userId === '') {
      setPreviewUser(null);
      return;
    }

    const matchingUser = users.find(
      (user) => String(user.id) === String(userId),
    );
    const fallbackUser =
      selectedUser && String(selectedUser.id) === String(userId)
        ? selectedUser
        : null;
    const resolvedUser = matchingUser ?? fallbackUser;

    setPreviewUser(
      resolvedUser
        ? { id: String(resolvedUser.id), name: resolvedUser.name }
        : { id: String(userId), name: t("User", "User") },
    );
    setIsPreviewOpen(true);

    const result = await handlePreview(userId);
    if (!result) {
      setIsPreviewOpen(false);
      setPreviewUser(null);
    }
  };

  const previewUserId = previewUser?.id ?? selectedUser?.id;

  const requestSecureExport = (format: 'pdf' | 'excel', userId?: string | number) => {
    setExportPassword("");
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
      requestSecureExport('pdf', previewUserId);
    }
  };

  const handleExportExcelFromPreview = () => {
    requestSecureExport('excel', previewUserId);
  };

  return (
    <div className="w-full font-sans">
      <div className="w-full space-y-6">
        
        <ReportSummaryCards filters={filters} />

        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
          filters={filters}
          onFilterChange={updateFilter}
          pagination={pagination}
          loading={loadingUsers}
          masterData={masterData}
          filterOptionsError={filterOptionsError}
          onReloadFilterOptions={reloadFilterOptions}
          onExport={requestSecureExport}
          onPreview={handlePreviewClick}
          previewLoading={loadingPreview}
          exporting={exporting}
          onImpersonate={handleBypassUser} // Kirim props onImpersonate ke UserList
          onOpenDownloadHistory={
            canViewDownloadHistory
              ? () => setIsDownloadHistoryOpen(true)
              : undefined
          }
        />

        {/* Preview Modal */}
        <ReportPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewUser(null);
            clearPreview();
          }}
          onDownload={handleDownloadFromPreview}
          onExportExcel={handleExportExcelFromPreview}
          previewData={previewData}
          loading={loadingPreview}
          title={
            previewUser
              ? t("Preview Laporan - {name}", "Report preview - {name}", {
                  name: previewUser.name,
                })
              : t("Preview Laporan", "Report preview")
          }
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

        {canViewDownloadHistory ? (
          <ReportDownloadHistoryModal
            isOpen={isDownloadHistoryOpen}
            onClose={() => setIsDownloadHistoryOpen(false)}
          />
        ) : null}

      </div>
    </div>
  );
};

export default ReportPage;
