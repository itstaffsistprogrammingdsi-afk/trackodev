import { useEffect, useState } from "react";
import {
  Clock3,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from "lucide-react";

import { getCampaignStats } from "../api/campaign.api";
import type { CampaignStatsData } from "../types";

type Props = {
  campaignId: string;
};

export default function CampaignStats({
  campaignId,
}: Props) {
  const [data, setData] =
    useState<CampaignStatsData | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res =
          await getCampaignStats(campaignId);

        setData(res);
      } catch (err) {
        console.error(
          "CAMPAIGN STATS ERROR:",
          err
        );

        setData(null);
      } finally {
        setLoading(false);
      }
    };

    if (!campaignId) return;

    fetch();
  }, [campaignId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border rounded-xl p-4 animate-pulse"
          >
            <div className="w-8 h-8 bg-gray-200 rounded" />
            <div className="mt-4 h-8 bg-gray-200 rounded" />
            <div className="mt-2 h-4 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white border rounded-xl p-4 text-gray-500">
        No stats available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

      <StatCard
        title="Total Tasks"
        value={data.total_tasks ?? 0}
        color="text-slate-500"
        icon={<Clock3 size={18} />}
      />

      <StatCard
        title="Completed"
        value={data.completed ?? 0}
        color="text-green-500"
        icon={<CheckCircle2 size={18} />}
      />

      <StatCard
        title="In Progress"
        value={data.in_progress ?? 0}
        color="text-blue-500"
        icon={<Activity size={18} />}
      />

      <StatCard
        title="Overdue"
        value={data.overdue ?? 0}
        color="text-red-500"
        icon={<AlertTriangle size={18} />}
      />
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
};

function StatCard({
  title,
  value,
  icon,
  color,
}: StatCardProps) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition">
      <div className={color}>
        {icon}
      </div>

      <div className="mt-4 text-2xl font-bold">
        {value}
      </div>

      <div className="text-sm text-gray-500">
        {title}
      </div>
    </div>
  );
}