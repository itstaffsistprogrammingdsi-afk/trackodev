import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

import { Calendar } from "lucide-react";

import { getCampaign } from "../api/campaign.api";
import { Campaign } from "../types";

import CampaignStats from "../components/CampaignStats";
import CampaignHealth from "../components/CampaignHealth";
import BoardProgress from "../components/BoardProgress";
import CampaignGantt from "../components/CampaignGantt";
import OverdueTasks from "../components/OverdueTasks";
import { useAuth } from "@/context/AuthContext";

export default function CampaignDetailPage() {
  const { can } = useAuth();
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

    if (campaignId) {
      fetchCampaign();
    }
  }, [campaignId, navigate]);

  if (!campaign) {
    return <div className="p-6">Loading...</div>;
  }

  /* =========================================
     CAMPAIGN PERIOD
  ========================================= */

  const startDate = campaign.created_at
    ? new Date(campaign.created_at)
    : new Date();
  const endDate = campaign.due_date ? new Date(campaign.due_date) : null;

  const formatDate = (date: Date) =>
    date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const durationDays = endDate
    ? Math.max(
        1,
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1, // inclusive
      )
    : null;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      {/* =========================================
          HERO
      ========================================= */}

      <div className="bg-white border rounded-3xl p-5 sm:p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col xl:flex-row gap-6 xl:items-start xl:justify-between">
          {/* LEFT */}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold break-words">
              {campaign.name}
            </h1>

            <p className="mt-3 text-sm sm:text-base text-gray-500 max-w-4xl">
              {campaign.description || "No description"}
            </p>

            {/* PERIOD */}
            <div className="flex items-start gap-3 mt-6">
              <div className="p-2 rounded-xl bg-blue-50 shrink-0">
                <Calendar size={18} className="text-blue-600" />
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-gray-400">
                  Periode Campaign
                </div>

                <div className="font-semibold text-gray-900 mt-1">
                  {formatDate(startDate)}

                  {endDate && <> - {formatDate(endDate)}</>}
                </div>

                {durationDays && (
                  <div className="text-sm text-gray-500 mt-1">
                    Durasi:
                    <span className="font-medium text-gray-700 ml-1">
                      {durationDays} Hari
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          STATS
      ========================================= */}

      {(can("campaign.analytics.view") || can("campaign.stats.view")) && <CampaignStats campaignId={campaign.id} />}

      {/* =========================================
          BOARD PROGRESS
      ========================================= */}

      {(can("campaign.analytics.view") || can("campaign.progress.view")) && <BoardProgress campaignId={campaign.id} />}

      {/* =========================================
          GANTT
      ========================================= */}

      <div className="overflow-hidden">
        {(can("campaign.analytics.view") || can("campaign.gantt.view")) && <CampaignGantt campaignId={campaign.id} />}
      </div>

      {/* =========================================
          HEALTH + OVERDUE
      ========================================= */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          {(can("campaign.analytics.view") || can("campaign.health.view")) && <CampaignHealth campaignId={campaign.id} />}
        </div>

        <div>
          {(can("campaign.analytics.view") || can("campaign.overdue.view")) && <OverdueTasks campaignId={campaign.id} />}
        </div>
      </div>
    </div>
  );
}
