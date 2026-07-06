import React, { useEffect, useRef, useState } from 'react';
import { X, Download, FileText, Eye, FileSpreadsheet } from 'lucide-react';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
  onExportExcel: () => void;
  previewData: {
    html: string;
    pdf_base64: string;
    users_count: number;
    total_cards: number;
  } | null;
  loading: boolean;
  title?: string;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  onDownload,
  onExportExcel,
  previewData,
  loading,
  title = 'Preview Laporan',
}) => {
  const [viewMode, setViewMode] = useState<'html' | 'pdf'>('pdf');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen && previewData?.pdf_base64 && viewMode === 'pdf') {
      const iframe = iframeRef.current;
      if (iframe) {
        const pdfData = `data:application/pdf;base64,${previewData.pdf_base64}`;
        iframe.src = pdfData;
      }
    }
  }, [isOpen, previewData, viewMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-7xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                {previewData && (
                  <p className="text-sm text-gray-500">
                    {previewData.users_count} User · {previewData.total_cards} Card
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle View Mode */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setViewMode('pdf')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 ${
                    viewMode === 'pdf'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={() => setViewMode('html')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 ${
                    viewMode === 'html'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  HTML
                </button>
              </div>

              {/* Action Buttons */}
              <button
                onClick={onExportExcel}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
              
              <button
                onClick={onDownload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden bg-gray-100">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Sedang memuat preview...</p>
                <div className="mt-4 w-64 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            ) : previewData ? (
              <>
                {viewMode === 'pdf' ? (
                  <iframe
                    ref={iframeRef}
                    className="w-full h-full border-0"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="h-full overflow-auto p-4 bg-white">
                    <div 
                      className="max-w-6xl mx-auto"
                      dangerouslySetInnerHTML={{ __html: previewData.html }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Tidak ada data untuk dipreview</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50/80 flex justify-between items-center flex-wrap gap-2">
            <div className="text-sm text-gray-500">
              <span className="font-medium">Tip:</span> Gunakan tombol PDF/HTML untuk beralih tampilan
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};