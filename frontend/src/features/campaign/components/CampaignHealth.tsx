import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  ShieldAlert,
} from "lucide-react";

import { getCampaignHealth } from "../api/campaign.api";
import type { CampaignHealthData } from "../types";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  campaignId: string;
};

export default function CampaignHealth({ campaignId }: Props) {
  const { t } = useLanguage();
  const [data, setData] = useState<CampaignHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const realtimeRevision = useRealtimeRevision([
    "Assignment", "Board", "Campaign", "Card", "Task",
  ]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getCampaignHealth(campaignId);
        setData(res);
      } catch (err) {
        console.error("HEALTH ERROR:", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      fetch();
    }
  }, [campaignId, realtimeRevision]);

  if (loading) {
    return (
      <div
        className="rounded-panel border border-line bg-surface p-5 sm:p-6"
        role="status"
        aria-busy="true"
      >
        <span className="sr-only">
          {t("Memuat kesehatan campaign", "Loading campaign health")}
        </span>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-5 h-2 w-full" />
        <div className="mt-5 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="space-y-2 bg-surface p-4">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-panel border border-line bg-surface p-5">
        <EmptyState
          icon={HeartPulse}
          title={t(
            "Kesehatan campaign belum tersedia",
            "Campaign health isn't available yet",
          )}
          description={t(
            "Data akan muncul setelah ada task dan anggota aktif pada campaign ini.",
            "Data will appear once this campaign has tasks and active members.",
          )}
        />
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-control bg-surface-muted text-fg-subtle">
              <HeartPulse size={15} aria-hidden="true" />
            </span>
            <h2 className="text-sm font-semibold text-fg">
              {t("Kesehatan campaign", "Campaign health")}
            </h2>
          </div>

          <p className="mt-1 text-xs text-fg-muted">
            {t(
              "Kondisi keseluruhan berdasarkan completion rate dan task terlambat.",
              "Overall condition based on completion rate and overdue tasks.",
            )}
          </p>
        </div>

        <HealthBadge status={data.status} />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-fg-muted">
            {t("Tingkat penyelesaian", "Completion rate")}
          </span>
          <span className="font-medium tabular-nums text-fg">
            {data.completion_rate}%
          </span>
        </div>

        <div
          className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={data.completion_rate}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("Completion rate campaign", "Campaign completion rate")}
        >
          <div
            className="h-full rounded-full bg-success transition-[width] duration-300 ease-soft"
            style={{ width: `${data.completion_rate}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
        <HealthMetric
          label={t("Tingkat penyelesaian", "Completion rate")}
          value={`${data.completion_rate}%`}
        />
        <HealthMetric
          label={t("Task terlambat", "Overdue tasks")}
          value={`${data.overdue_tasks}`}
          tone={data.overdue_tasks > 0 ? "danger" : "default"}
        />
        <HealthMetric
          label={t("Anggota aktif", "Active members")}
          value={`${data.active_members}`}
        />
      </div>
    </div>
  );
}

function HealthBadge({
  status,
}: {
  status: "Healthy" | "At Risk" | "Critical";
}) {
  const { t } = useLanguage();
  const config = {
    Healthy: {
      className: "bg-success-soft text-success",
      icon: <CheckCircle2 size={13} />,
      label: "Sehat",
      labelEn: "Healthy",
    },
    "At Risk": {
      className: "bg-warning-soft text-warning",
      icon: <AlertTriangle size={13} />,
      label: "Berisiko",
      labelEn: "At risk",
    },
    Critical: {
      className: "bg-danger-soft text-danger",
      icon: <ShieldAlert size={13} />,
      label: "Kritis",
      labelEn: "Critical",
    },
  } as const;

  const item = config[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${item.className}`}
    >
      {item.icon}
      {t(item.label, item.labelEn)}
    </span>
  );
}

function HealthMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className="bg-surface p-4">
      <p
        className={`text-lg font-semibold tabular-nums ${
          tone === "danger" ? "text-danger" : "text-fg"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-fg-muted">{label}</p>
    </div>
  );
}
