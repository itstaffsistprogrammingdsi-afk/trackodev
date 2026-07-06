import React, { useState } from 'react';
import { Card, User } from '../types';
import { X, Download, FileSpreadsheet, Eye, CheckCircle, Clock } from 'lucide-react';

interface CardDetailProps {
  selectedUser: User;
  cards: Card[];
  loading: boolean;
  onQcSubmit: (attachmentId: string, qcQuantity: number, qcNote: string) => Promise<boolean>;
  onClose: () => void;
  onExport?: (type: 'excel' | 'pdf', userId?: string | number) => void;
  onPreview?: (userId?: string | number) => void;
  exporting?: boolean;
}

export const CardDetail: React.FC<CardDetailProps> = ({
  selectedUser,
  cards,
  loading,
  onQcSubmit,
  onClose,
  onExport,
  onPreview,
  exporting = false,
}) => {
  const [qcValues, setQcValues] = useState<{ [key: string]: string }>({});
  const [qcNotes, setQcNotes] = useState<{ [key: string]: string }>({});
  const [submittingQc, setSubmittingQc] = useState<{ [key: string]: boolean }>({});

  const handleQcSubmit = async (attachmentId: string) => {
    const quantity = parseInt(qcValues[attachmentId] || '0');
    const note = qcNotes[attachmentId] || '';

    if (isNaN(quantity) || quantity < 0) {
      alert('Jumlah QC harus berupa angka positif');
      return;
    }

    setSubmittingQc((prev) => ({ ...prev, [attachmentId]: true }));
    try {
      const success = await onQcSubmit(attachmentId, quantity, note);
      if (success) {
        setQcValues((prev) => ({ ...prev, [attachmentId]: '' }));
        setQcNotes((prev) => ({ ...prev, [attachmentId]: '' }));
      }
    } finally {
      setSubmittingQc((prev) => ({ ...prev, [attachmentId]: false }));
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 w-full max-w-5xl bg-white shadow-2xl overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedUser.name}</h2>
              <p className="text-sm text-gray-500">Detail Laporan Pekerjaan</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onPreview?.(selectedUser.id)}
                className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => onExport?.('pdf', selectedUser.id)}
                disabled={exporting}
                className="px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={() => onExport?.('excel', selectedUser.id)}
                disabled={exporting}
                className="px-3 py-1.5 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
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
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500">Tidak ada card yang ditemukan untuk user ini.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {cards.map((card) => (
                  <div key={card.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                        {card.campaign && (
                          <p className="text-sm text-gray-500">Campaign: {card.campaign.name}</p>
                        )}
                        {card.board && (
                          <p className="text-sm text-gray-500">Board: {card.board.name}</p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          card.is_completed
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {card.is_completed ? 'Completed' : 'In Progress'}
                      </span>
                    </div>

                    {/* Labels & Brands */}
                    {(card.labels?.length > 0 || card.brands?.length > 0) && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {card.labels?.map((label) => (
                          <span
                            key={label.id}
                            className="px-2 py-1 text-xs rounded-md"
                            style={{ backgroundColor: label.color || '#e5e7eb' }}
                          >
                            {label.name}
                          </span>
                        ))}
                        {card.brands?.map((brand) => (
                          <span
                            key={brand.id}
                            className="px-2 py-1 text-xs rounded-md border"
                            style={{ borderColor: brand.color || '#d1d5db' }}
                          >
                            {brand.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Attachments */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Attachment & QC</h4>
                      <div className="space-y-3">
                        {card.attachments?.length > 0 ? (
                          card.attachments.map((attachment) => {
                            const isQcDone = attachment.qc_quantity !== null;
                            const isSubmitting = submittingQc[attachment.id] || false;
                            const maxQty = attachment.quantity || 0;

                            return (
                              <div
                                key={attachment.id}
                                className={`bg-gray-50 rounded-lg p-4 border ${
                                  isQcDone ? 'border-green-200' : 'border-gray-200'
                                }`}
                              >
                                <div className="flex flex-col gap-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium text-gray-800">
                                          {attachment.file_name}
                                        </p>
                                        {isQcDone ? (
                                          <CheckCircle className="w-4 h-4 text-green-600" />
                                        ) : (
                                          <Clock className="w-4 h-4 text-yellow-500" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                        <span>Total: {maxQty}</span>
                                        {isQcDone && (
                                          <>
                                            <span>|</span>
                                            <span className="text-green-600 font-medium">
                                              QC: {attachment.qc_quantity}
                                            </span>
                                            {attachment.qc_user && (
                                              <span>| oleh: {attachment.qc_user.name}</span>
                                            )}
                                            {attachment.qc_at && (
                                              <span>| {new Date(attachment.qc_at).toLocaleDateString()}</span>
                                            )}
                                          </>
                                        )}
                                      </div>
                                      {attachment.qc_note && (
                                        <p className="text-sm text-gray-600 mt-1 bg-gray-100 p-2 rounded">
                                          📝 Catatan: {attachment.qc_note}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* QC Input Area */}
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                                      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                        QC:
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        max={maxQty}
                                        value={qcValues[attachment.id] ?? ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0)) {
                                            setQcValues((prev) => ({
                                              ...prev,
                                              [attachment.id]: val,
                                            }));
                                          }
                                        }}
                                        placeholder={`0 - ${maxQty}`}
                                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                        disabled={isQcDone || isSubmitting}
                                      />
                                      <span className="text-sm text-gray-400">/ {maxQty}</span>
                                    </div>

                                    <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                                      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                        Catatan:
                                      </label>
                                      <input
                                        type="text"
                                        value={qcNotes[attachment.id] ?? ''}
                                        onChange={(e) => {
                                          setQcNotes((prev) => ({
                                            ...prev,
                                            [attachment.id]: e.target.value,
                                          }));
                                        }}
                                        placeholder="Catatan QC..."
                                        className="flex-1 min-w-[100px] px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                        disabled={isQcDone || isSubmitting}
                                      />
                                    </div>

                                    <button
                                      onClick={() => handleQcSubmit(attachment.id)}
                                      disabled={
                                        isQcDone ||
                                        isSubmitting ||
                                        !qcValues[attachment.id] ||
                                        Number(qcValues[attachment.id]) < 0 ||
                                        Number(qcValues[attachment.id]) > maxQty
                                      }
                                      className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                                        isQcDone
                                          ? 'bg-green-100 text-green-700 cursor-default'
                                          : isSubmitting
                                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                          : 'bg-blue-600 text-white hover:bg-blue-700'
                                      }`}
                                    >
                                      {isQcDone ? '✓ Selesai' : isSubmitting ? '...' : 'Submit QC'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-gray-400 text-sm">Tidak ada attachment</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};