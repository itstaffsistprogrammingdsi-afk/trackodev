import React, { useState } from 'react';
import { Card, Attachment, User } from '../types';

interface CardDetailProps {
  selectedUser: User | null;
  cards: Card[];
  loading: boolean;
  onQcSubmit: (attachmentId: string, qcQuantity: number, qcNote: string) => Promise<boolean>;
}

export const CardDetail: React.FC<CardDetailProps> = ({
  selectedUser,
  cards,
  loading,
  onQcSubmit,
}) => {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [qcForm, setQcForm] = useState<{ [key: string]: { quantity: number; note: string } }>({});

  const handleInputChange = (attachmentId: string, field: 'quantity' | 'note', value: any) => {
    setQcForm((prev) => ({
      ...prev,
      [attachmentId]: {
        ...prev[attachmentId],
        [field]: value,
      },
    }));
  };

  const executeQc = async (attachment: Attachment) => {
    const data = qcForm[attachment.id] || { quantity: attachment.quantity, note: '' };
    setSubmittingId(attachment.id);
    const success = await onQcSubmit(attachment.id, data.quantity, data.note);
    if (success) {
      alert('Verifikasi QC Berhasil Disimpan!');
    }
    setSubmittingId(null);
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8 text-gray-500">
        <p className="text-base font-medium">Pilih salah satu user di panel kiri</p>
        <p className="text-xs mt-1">Untuk meninjau laporan hasil pekerjaan dan data verifikasi QC</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden">
      {/* Header Right Panel */}
      <div className="bg-white p-4 border-b border-gray-200 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">{selectedUser.name}</h1>
        <p className="text-xs text-gray-500 mt-0.5">Riwayat Tugas & Pelaporan Bukti Kerja</p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Memuat rincian pekerjaan...</div>
        ) : cards.length === 0 ? (
          <div className="text-center py-12 text-gray-500">User ini belum memiliki tugas/laporan dalam filter yang dipilih.</div>
        ) : (
          cards.map((card) => (
            <div key={card.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Card Meta Header */}
              <div className="bg-gray-50 p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block">
                    {card.campaign?.name || 'No Campaign'}
                  </span>
                  <h3 className="text-base font-bold text-gray-900 mt-0.5">{card.title}</h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full font-medium bg-gray-200 text-gray-700">
                    {card.status}
                  </span>
                  {card.priority === 'high' && (
                    <span className="px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                      High Priority
                    </span>
                  )}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="p-4 bg-white">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  File Bukti / Attachments ({card.attachments.length})
                </h4>
                
                {card.attachments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Belum ada file bukti diunggah.</p>
                ) : (
                  <div className="space-y-4">
                    {card.attachments.map((att) => {
                      const currentQcData = qcForm[att.id] || { quantity: att.qc_quantity ?? att.quantity, note: att.qc_note || '' };
                      
                      return (
                        <div key={att.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between">
                          
                          {/* Info File */}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-gray-900 break-all">{att.file_name}</span>
                              {att.file_url && (
                                <a 
                                  href={att.file_url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-xs text-blue-500 hover:underline shrink-0"
                                >
                                  [Buka File]
                                </a>
                              )}
                            </div>
                            <p className="text-xs text-gray-600">
                              Kuantitas Kirim: <span className="font-bold text-gray-900">{att.quantity}</span>
                            </p>
                            {att.result_description && (
                              <p className="text-xs text-gray-500 bg-white p-2 rounded border border-gray-100">
                                <span className="font-medium text-gray-700 block">Keterangan User:</span>
                                {att.result_description}
                              </p>
                            )}

                            {/* Info Status QC Terkini (Jika sudah pernah di-QC) */}
                            {att.qc_at && (
                              <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded text-xs text-green-800">
                                <strong>Hasil Terkini:</strong> Disetujui {att.qc_quantity} dari {att.quantity}. <br />
                                <strong>Catatan Admin:</strong> {att.qc_note || '-'}<br />
                                <span className="text-[10px] text-gray-400 block mt-1">Oleh: {att.qc_user?.name} | {att.qc_at}</span>
                              </div>
                            )}
                          </div>

                          {/* Form Input Action QC (Sisi Kanan) */}
                          <div className="w-full md:w-64 bg-white p-3 border border-gray-200 rounded-lg shadow-sm flex flex-col gap-2">
                            <span className="text-xs font-bold text-gray-700 block">Form Evaluasi QC</span>
                            
                            <div>
                              <label className="text-[10px] text-gray-400 block font-semibold">JUMLAH VALID (ACC)</label>
                              <input
                                type="number"
                                min={0}
                                max={att.quantity}
                                value={currentQcData.quantity}
                                onChange={(e) => handleInputChange(att.id, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-gray-400 block font-semibold">CATATAN EVALUASI</label>
                              <textarea
                                placeholder="Tulis alasan jika ada koreksi..."
                                value={currentQcData.note}
                                onChange={(e) => handleInputChange(att.id, 'note', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-12 resize-none focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>

                            <button
                              type="button"
                              disabled={submittingId === att.id}
                              onClick={() => executeQc(att)}
                              className="w-full text-center py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded text-xs transition-colors"
                            >
                              {submittingId === att.id ? 'Menyimpan...' : 'Simpan Verifikasi'}
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};