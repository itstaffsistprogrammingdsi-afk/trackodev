import { useEffect, useState } from "react";

import { getCampaignStats } from "../api/campaign.api";
import type { CampaignStatsData } from "../types";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import { Skeleton } from "@/components/ui/Skeleton";

type Props = {
  campaignId: string;
};

export default function CampaignStats({ campaignId }: Props) {
  const [data, setData] = useState<CampaignStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const realtimeRevision = useRealtimeRevision([
    "Board", "Card", "Subtask", "Task",
  ]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getCampaignStats(campaignId);
        setData(res);
      } catch (err) {
        console.error("CAMPAIGN STATS ERROR:", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    if (!campaignId) return;

    fetch();
  }, [campaignId, realtimeRevision]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 bg-surface p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-panel border border-line bg-surface p-4 text-sm text-fg-muted">
        Statistik campaign belum tersedia.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line lg:grid-cols-4">
      <StatCard title="Total task" value={data.total_tasks ?? 0} />
      <StatCard title="Selesai" value={data.completed ?? 0} tone="success" />
      <StatCard title="Berjalan" value={data.in_progress ?? 0} tone="accent" />
      <StatCard title="Terlambat" value={data.overdue ?? 0} tone="danger" />
    </div>
  );
}

function StatCard({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: number;
  tone?: "default" | "success" | "accent" | "danger";
}) {
  const toneClass =
    tone === "danger" && value > 0
      ? "text-danger"
      : tone === "success" && value > 0
        ? "text-success"
        : tone === "accent" && value > 0
          ? "text-accent"
          : "text-fg";

  return (
    <div className="bg-surface p-4 sm:p-5">
      <p className={`text-[22px] font-semibold leading-none tabular-nums tracking-[-0.02em] ${toneClass}`}>
        {value.toLocaleString("id-ID")}
      </p>
      <p className="mt-2 text-[11px] font-medium text-fg-muted">{title}</p>
    </div>
  );
}
