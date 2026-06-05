import { HeartPulse } from "lucide-react";

export default function CampaignHealth() {
  const health = "At Risk";

  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <HeartPulse
              size={18}
              className="text-yellow-500"
            />

            <h2 className="font-semibold text-lg">
              Campaign Health
            </h2>
          </div>

          <p className="text-sm text-gray-500">
            Campaign berjalan cukup baik namun masih
            terdapat beberapa task overdue yang perlu
            segera diselesaikan.
          </p>
        </div>

        <HealthBadge status={health} />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <HealthMetric
          label="Completion Rate"
          value="68%"
        />

        <HealthMetric
          label="Overdue Tasks"
          value="3"
        />

        <HealthMetric
          label="Active Members"
          value="7"
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
  const styles = {
    Healthy:
      "bg-green-100 text-green-700 border-green-200",

    "At Risk":
      "bg-yellow-100 text-yellow-700 border-yellow-200",

    Critical:
      "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <div
      className={`px-4 py-2 rounded-full border text-sm font-medium ${styles[status]}`}
    >
      {status}
    </div>
  );
}

function HealthMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-2xl font-bold">
        {value}
      </div>

      <div className="text-sm text-gray-500">
        {label}
      </div>
    </div>
  );
}