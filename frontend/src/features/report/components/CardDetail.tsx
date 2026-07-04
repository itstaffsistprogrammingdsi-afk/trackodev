import React, { useState, useEffect } from 'react';
import { Card, Attachment, User } from '../types';

interface CardDetailProps {
  selectedUser: User;
  cards: Card[];
  loading: boolean;
  onQcSubmit: (attachmentId: string, qcQuantity: number, qcNote: string) => Promise<boolean>;
  onClose: () => void;
  onExport?: (type: 'excel' | 'pdf', userId?: string | number) => void;
}

export const CardDetail: React.FC<CardDetailProps> = ({
  selectedUser,
  cards,
  loading,
  onQcSubmit,
  onClose,
}) => {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [qcForm, setQcForm] = useState<{ [key: string]: { quantity: number; note: string } }>({});

  // Mencegah scroll pada body halaman utama saat modal terbuka
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleInputChange = (attachmentId: string, field: 'quantity' | 'note', value: string | number) => {
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop Kaca (Dim) */}
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer Panel (Muncul dari kanan) */}
      <div className="relative w-full max-w-3xl bg-gray-50 h-full flex flex-col shadow-2xl animate-slide-in-right">
        
        {/* Header Drawer */}
        <div className="bg-white px-6 py-5 border-b border-gray-200 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h2>
            <p className="text-sm text-gray-500 mt-1">Laporan Pekerjaan & QC Verifikasi</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 bg-gray-100 hover:bg-red-100 hover:text-red-600 rounded-full text-gray-500 transition-colors"
            title="Tutup"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Konten Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : cards.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-dashed border-gray-300 text-center">
              <p className="text-gray-500 font-medium">Belum ada tugas atau laporan pekerjaan.</p>
            </div>
          ) : (
            cards.map((card) => (
              <div key={card.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:border-gray-300">
                {/* Header Card */}
                <div className="p-5 border-b border-gray-100 flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase tracking-widest rounded-md mb-2">
                      {card.campaign?.name || 'Tanpa Campaign'}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{card.title}</h3>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                    Status: {card.status}
                  </span>
                </div>

                {/* Body Card (Attachments) */}
                <div className="p-5 bg-gray-50/50">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                    File Bukti ({card.attachments.length})
                  </h4>
                  
                  {card.attachments.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Belum ada lampiran dikirim.</p>
                  ) : (
                    <div className="space-y-5">
                      {card.attachments.map((att) => {
                        const currentQcData = qcForm[att.id] || { quantity: att.qc_quantity ?? att.quantity, note: att.qc_note || '' };
                        const isVerified = att.qc_at !== null;

                        return (
                          <div key={att.id} className="p-5 border border-gray-200 rounded-xl bg-white shadow-sm flex flex-col md:flex-row gap-6">
                            
                            {/* Detail Informasi */}
                            <div className="flex-1 space-y-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-base text-gray-900 break-all">{att.file_name}</span>
                                {att.file_url && (
                                  <a href={att.file_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline mt-1 w-max">
                                    Buka File Lampiran &rarr;
                                  </a>
                                )}
                              </div>
                              
                              <div className="inline-flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div>
                                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Kuantitas Kirim</span>
                                  <span className="text-lg font-black text-gray-800">{att.quantity}</span>
                                </div>
                                <div className="w-px bg-gray-200"></div>
                                <div>
                                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Disetujui</span>
                                  <span className={`text-lg font-black ${isVerified ? 'text-green-600' : 'text-gray-400'}`}>
                                    {isVerified ? att.qc_quantity : '-'}
                                  </span>
                                </div>
                              </div>

                              {att.result_description && (
                                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                  <span className="text-xs font-bold text-blue-800 block mb-1">Catatan Pekerja:</span>
                                  <p className="text-sm text-gray-700">{att.result_description}</p>
                                </div>
                              )}
                              
                              {isVerified && (
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-sm">
                                  <span className="font-bold text-green-800 block mb-1">Evaluasi Terakhir ({att.qc_at}):</span>
                                  <p className="text-green-700">{att.qc_note || 'Tidak ada catatan.'}</p>
                                  <span className="text-[10px] text-green-600/70 font-semibold uppercase mt-2 block">Oleh: {att.qc_user?.name}</span>
                                </div>
                              )}
                            </div>

                            {/* Panel Form Action QC */}
                            <div className="w-full md:w-72 bg-gray-50 p-4 border border-gray-200 rounded-xl flex flex-col justify-between">
                              <div className="space-y-4">
                                <div>
                                  <label className="text-[11px] text-gray-600 block font-bold uppercase tracking-wider mb-1.5">Kuantitas ACC</label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={att.quantity}
                                    value={currentQcData.quantity}
                                    onChange={(e) => handleInputChange(att.id, 'quantity', parseInt(e.target.value, 10) || 0)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] text-gray-600 block font-bold uppercase tracking-wider mb-1.5">Catatan QC</label>
                                  <textarea
                                    placeholder="Alasan penolakan / koreksi..."
                                    value={currentQcData.note}
                                    onChange={(e) => handleInputChange(att.id, 'note', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg h-24 resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-sm"
                                  />
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={submittingId === att.id}
                                onClick={() => executeQc(att)}
                                className="w-full mt-4 text-center py-2.5 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-semibold rounded-lg text-sm transition-all shadow-md active:scale-95"
                              >
                                {submittingId === att.id ? 'Menyimpan...' : (isVerified ? 'Perbarui Verifikasi' : 'Simpan Verifikasi')}
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
    </div>
  );
};