import { useParams } from "react-router-dom";
import { useState } from "react";
import { useCampaign } from "../hooks/useCampaign";
import CampaignCard from "../components/CampaignCard";
import CampaignForm from "../components/CampaignForm";
import { useQueryClient } from "@tanstack/react-query";

export default function CampaignListPage() {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();

  const { campaigns, loading } = useCampaign(workspaceId);

  const [open, setOpen] = useState(false);

  // 🔥 central refresh handler (dipakai semua child)
  const refreshCampaigns = () => {
    queryClient.invalidateQueries({
      queryKey: ["campaigns", workspaceId],
    });
  };

  return (
    <div className="p-6 space-y-4">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Campaigns / Project</h1>

        <button
          onClick={() => setOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:opacity-90"
        >
          + Campaign
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="text-sm text-gray-500">
          Loading campaigns...
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && campaigns.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          Belum ada campaign
        </div>
      )}

      {/* LIST */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {campaigns.map((c) => (
          <CampaignCard
            key={c.id}
            campaign={c}
            onChanged={refreshCampaigns} // 🔥 penting untuk delete/edit
          />
        ))}
      </div>

      {/* MODAL CREATE */}
      {open && workspaceId && (
        <CampaignForm
          workspaceId={workspaceId}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            refreshCampaigns(); // 🔥 langsung sync list
          }}
        />
      )}
    </div>
  );
}