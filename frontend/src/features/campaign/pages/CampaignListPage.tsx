import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useCampaign } from "../hooks/useCampaign";
import CampaignCard from "../components/CampaignCard";
import CampaignForm from "../components/CampaignForm";

export default function CampaignListPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();

  // 1. Menggunakan return value asli dari useCampaign (tanpa isFetching)
  const { campaigns, loading } = useCampaign(workspaceId);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 🔥 Central refresh handler
  const refreshCampaigns = () => {
    if (workspaceId) {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", workspaceId],
      });
    }
  };

  // 2. Membungkus array fallback dengan useMemo agar referensi memori stabil (Fix ESLint)
  const campaignList = useMemo(() => {
    return Array.isArray(campaigns) ? campaigns : [];
  }, [campaigns]);

  // 3. Filter pencarian menggunakan property 'name' sesuai tipe Campaign (Fix TS2339)
  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) return campaignList;
    return campaignList.filter((c) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [campaignList, searchQuery]);

  const hasCampaigns = campaignList.length > 0;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 🟢 HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-indigo-600 font-bold">Campaigns</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Campaigns & Projects
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola dan pantau seluruh performa campaign pemasaran Anda dalam satu tempat.
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={refreshCampaigns}
            disabled={loading}
            className="inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm disabled:opacity-50"
            title="Refresh Data"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-sm shadow-indigo-200 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Campaign Baru</span>
          </button>
        </div>
      </div>

      {/* 🔍 SEARCH & STATS BAR */}
      {hasCampaigns && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="relative flex-1">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Cari campaign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-transparent bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 placeholder-slate-400"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium px-2 self-end sm:self-center">
            Total: <span className="text-slate-900 font-semibold">{filteredCampaigns.length}</span> campaign
          </div>
        </div>
      )}

      {/* ⏳ SKELETON LOADING */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-white border border-slate-200 p-5 space-y-4 animate-pulse shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 bg-slate-200 rounded-md w-1/2" />
                <div className="h-6 bg-slate-200 rounded-full w-16" />
              </div>
              <div className="h-4 bg-slate-100 rounded-md w-3/4" />
              <div className="h-4 bg-slate-100 rounded-md w-2/3" />
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="h-8 bg-slate-200 rounded-lg w-20" />
                <div className="h-8 bg-slate-100 rounded-lg w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        /* 📭 EMPTY STATE */
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-300 text-center shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h18l-2 5 2 5H7a3.996 3.996 0 01-1.564-.317z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            {searchQuery ? "Campaign tidak ditemukan" : "Belum Ada Campaign"}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1 mb-6">
            {searchQuery
              ? `Tidak ada hasil yang cocok dengan "${searchQuery}". Coba kata kunci lain.`
              : "Mulai buat campaign pemasaran pertama Anda untuk menjangkau target audiens."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Buat Campaign Sekarang
            </button>
          )}
        </div>
      ) : (
        /* 📦 CAMPAIGN GRID LIST */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCampaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} onChanged={refreshCampaigns} />
          ))}
        </div>
      )}

      {/* 🔲 MODAL CREATE */}
      {open && workspaceId && (
        <CampaignForm
          workspaceId={workspaceId}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            refreshCampaigns();
          }}
        />
      )}
    </div>
  );
}