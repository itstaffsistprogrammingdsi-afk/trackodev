import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Megaphone, SearchX } from "lucide-react";

import { useCampaign } from "../hooks/useCampaign";
import CampaignCard from "../components/CampaignCard";
import CampaignForm from "../components/CampaignForm";
import EmptyState from "@/components/ui/EmptyState";

export default function CampaignListPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();

  // 1. Menggunakan return value asli dari useCampaign (tanpa isFetching)
  const { campaigns, loading } = useCampaign(workspaceId);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSearchQuery("");
  }, [workspaceId]);

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
    const query = searchQuery.trim().toLowerCase();
    if (!query) return campaignList;
    return campaignList.filter((c) =>
      c.name?.toLowerCase().includes(query)
    );
  }, [campaignList, searchQuery]);

  const hasCampaigns = campaignList.length > 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* HEADER PAGE */}
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-fg-subtle">
            <span>Workspace</span>
            <span aria-hidden="true">/</span>
            <span className="text-fg-muted">Campaigns</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[28px]">
            Campaign & project
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Kelola dan pantau seluruh performa campaign pemasaran Anda dalam satu tempat.
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={refreshCampaigns}
            disabled={loading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-line bg-surface text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-50"
            title="Muat ulang data"
            aria-label="Muat ulang data campaign"
          >
            <svg
              className={`h-4 w-4 ${loading ? "animate-spin text-accent motion-reduce:animate-none" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Campaign baru</span>
          </button>
        </div>
      </div>

      {/* SEARCH & STATS BAR */}
      {hasCampaigns && (
        <div className="flex flex-col items-stretch justify-between gap-3 rounded-panel border border-line bg-surface p-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              placeholder="Cari campaign"
              aria-label="Cari campaign"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-control border border-transparent bg-surface-muted pl-9 pr-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/40 focus:bg-surface focus:ring-2 focus:ring-accent/15"
            />
          </div>
          <div className="self-end px-2 text-[11px] font-medium text-fg-muted sm:self-center">
            Total: <span className="font-semibold text-fg">{filteredCampaigns.length}</span> campaign
          </div>
        </div>
      )}

      {/* SKELETON LOADING */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 space-y-4 rounded-card border border-line bg-surface p-5"
            >
              <div className="flex animate-pulse items-center justify-between motion-reduce:animate-none">
                <div className="h-5 w-1/2 rounded-md bg-surface-muted" />
                <div className="h-5 w-16 rounded-full bg-surface-muted" />
              </div>
              <div className="h-4 w-3/4 animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none" />
              <div className="h-4 w-2/3 animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none" />
              <div className="flex items-center justify-between border-t border-line pt-4">
                <div className="h-7 w-20 animate-pulse rounded-control bg-surface-muted motion-reduce:animate-none" />
                <div className="h-7 w-16 animate-pulse rounded-control bg-surface-muted motion-reduce:animate-none" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={searchQuery ? SearchX : Megaphone}
          title={searchQuery ? "Campaign tidak ditemukan" : "Belum ada campaign"}
          description={
            searchQuery
              ? `Tidak ada hasil yang cocok dengan "${searchQuery}". Coba kata kunci lain.`
              : "Mulai buat campaign pemasaran pertama Anda untuk menjangkau target audiens."
          }
          action={
            !searchQuery
              ? {
                  label: "Buat campaign",
                  onClick: () => setOpen(true),
                }
              : undefined
          }
          className="py-16"
        />
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
