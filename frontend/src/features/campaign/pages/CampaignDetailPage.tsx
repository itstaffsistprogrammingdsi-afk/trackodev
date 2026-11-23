import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
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
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import { Skeleton } from "@/components/ui/Skeleton";

export default function CampaignDetailPage() {
  const { can } = useAuth();
  const { campaignId } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const realtimeRevision = useRealtimeRevision(["Campaign"]);

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
  }, [campaignId, navigate, realtimeRevision]);

  if (!campaign) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-6" role="status" aria-busy="true">
        <span className="sr-only">Memuat detail campaign</span>
        <div className="space-y-3 rounded-panel border border-line bg-surface p-5 sm:p-6 lg:p-8">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-2/3 max-w-xl" />
          <div className="pt-4">
            <Skeleton className="h-10 w-64 max-w-full" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-24 rounded-panel" />
          ))}
        </div>
      </div>
    );
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

      <div className="rounded-panel border border-line bg-surface p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          {/* LEFT */}
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[28px]">
              {campaign.name}
            </h1>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-fg-muted">
              {campaign.description || "Belum ada deskripsi campaign."}
            </p>

            {/* PERIOD */}
            <div className="mt-5 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-muted text-fg-muted">
                <Calendar size={16} aria-hidden="true" />
              </div>

              <div>
                <div className="text-[11px] font-medium text-fg-subtle">
                  Periode campaign
                </div>

                <div className="mt-0.5 text-sm font-medium text-fg">
                  {formatDate(startDate)}

                  {endDate && <> – {formatDate(endDate)}</>}
                </div>

                {durationDays && (
                  <div className="mt-0.5 text-xs text-fg-muted">
                    Durasi
                    <span className="ml-1 font-medium text-fg">
                      {durationDays} hari
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
