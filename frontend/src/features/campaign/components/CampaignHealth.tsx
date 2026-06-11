import { useEffect, useState } from "react";
import {
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

import { getCampaignHealth } from "../api/campaign.api";
import type { CampaignHealthData } from "../types";

type Props = {
  campaignId: string;
};

export default function CampaignHealth({
  campaignId,
}: Props) {
  const [data, setData] =
    useState<CampaignHealthData | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getCampaignHealth(
          campaignId
        );

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
  }, [campaignId]);

  if (loading) {
    return (
      <div className="bg-white border rounded-xl p-5">
        Loading campaign health...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white border rounded-xl p-5 text-gray-500">
        No health data
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <HeartPulse
              size={18}
              className="text-rose-500"
            />

            <h2 className="font-semibold text-lg">
              Campaign Health
            </h2>
          </div>

          <p className="text-sm text-gray-500">
            Overall campaign condition based
            on completion and overdue tasks.
          </p>
        </div>

        <HealthBadge status={data.status} />
      </div>

      {/* COMPLETION */}
      <div className="mt-5">
        <div className="flex justify-between text-sm mb-2">
          <span>Completion Rate</span>
          <span className="font-medium">
            {data.completion_rate}%
          </span>
        </div>

        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{
              width: `${data.completion_rate}%`,
            }}
          />
        </div>
      </div>

      {/* METRICS */}
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <HealthMetric
          label="Completion Rate"
          value={`${data.completion_rate}%`}
        />

        <HealthMetric
          label="Overdue Tasks"
          value={`${data.overdue_tasks}`}
        />

        <HealthMetric
          label="Active Members"
          value={`${data.active_members}`}
        />
      </div>
    </div>
  );
}

/* =========================
   BADGE
========================= */

function HealthBadge({
  status,
}: {
  status: "Healthy" | "At Risk" | "Critical";
}) {
  const config = {
    Healthy: {
      className:
        "bg-green-100 text-green-700 border-green-200",
      icon: <CheckCircle2 size={14} />,
    },

    "At Risk": {
      className:
        "bg-yellow-100 text-yellow-700 border-yellow-200",
      icon: <AlertTriangle size={14} />,
    },

    Critical: {
      className:
        "bg-red-100 text-red-700 border-red-200",
      icon: <ShieldAlert size={14} />,
    },
  };

  const item = config[status];

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${item.className}`}
    >
      {item.icon}
      {status}
    </div>
  );
}

/* =========================
   METRIC
========================= */

function HealthMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border rounded-xl p-4">
      <div className="text-2xl font-bold">
        {value}
      </div>

      <div className="text-sm text-gray-500 mt-1">
        {label}
      </div>
    </div>
  );
}