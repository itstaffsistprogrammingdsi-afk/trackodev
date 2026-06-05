import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

import { Calendar, ArrowRight } from "lucide-react";

import { getCampaign } from "../api/campaign.api";
import { Campaign } from "../types";

import CampaignStats from "../components/CampaignStats";
import CampaignHealth from "../components/CampaignHealth";
import BoardProgress from "../components/BoardProgress";
import CampaignGantt from "../components/CampaignGantt";
import RecentActivity from "../components/RecentActivity";
import OverdueTasks from "../components/OverdueTasks";

export default function CampaignDetailPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const data = await getCampaign(campaignId!);

        setCampaign(data);
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          navigate("/unauthorized");
        }
      }
    };

    fetchCampaign();
  }, [campaignId, navigate]);

  if (!campaign) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 xl:p-8 max-w-[1600px] mx-auto">
      {/* HERO */}
      <div className="bg-white border rounded-3xl p-5 sm:p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col xl:flex-row gap-6 xl:items-start xl:justify-between">
          {/* LEFT */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                Active
              </span>

              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                68% Complete
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold break-words">
              {campaign.name}
            </h1>

            <p className="mt-3 text-sm sm:text-base text-gray-500 max-w-4xl">
              {campaign.description || "No description"}
            </p>

            {campaign.due_date && (
              <div className="flex flex-wrap items-center gap-2 mt-4 text-sm text-gray-500">
                <Calendar size={16} />
                <span>Due Date: {campaign.due_date}</span>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="w-full xl:w-[320px] shrink-0 border rounded-2xl bg-gray-50 p-5">
            <div className="text-sm text-gray-500">Campaign Progress</div>

            <div className="text-4xl font-bold mt-1">68%</div>

            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full"
                style={{
                  width: "68%",
                }}
              />
            </div>

            <button className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 hover:bg-white transition">
              Open Board
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <CampaignStats />

      {/* BOARD */}
      <BoardProgress />

      {/* TIMELINE */}
      <div className="overflow-hidden">
        <CampaignGantt />
      </div>

      {/* BOTTOM */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <RecentActivity />
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-lg mb-5">Risks & Blockers</h2>

          <div className="space-y-4">
            <div className="border rounded-xl p-4">
              <div className="font-medium">Client Approval Pending</div>

              <div className="text-sm text-gray-500 mt-1">
                Waiting for approval before final publishing.
              </div>
            </div>

            <div className="border rounded-xl p-4">
              <div className="font-medium">Missing Design Asset</div>

              <div className="text-sm text-gray-500 mt-1">
                Marketing team has not uploaded final assets.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HEALTH + OVERDUE */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <CampaignHealth />
        </div>

        <div>
          <OverdueTasks />
        </div>
      </div>
    </div>
  );
}
