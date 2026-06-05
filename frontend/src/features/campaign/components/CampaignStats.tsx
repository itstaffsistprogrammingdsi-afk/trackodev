import {
  Clock3,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from "lucide-react";

export default function CampaignStats() {
  return (
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">      <StatCard
        title="Total Tasks"
        value="24"
        icon={<Clock3 size={18} />}
      />

      <StatCard
        title="Completed"
        value="16"
        icon={<CheckCircle2 size={18} />}
      />

      <StatCard
        title="In Progress"
        value="5"
        icon={<Activity size={18} />}
      />

      <StatCard
        title="Overdue"
        value="3"
        icon={<AlertTriangle size={18} />}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      <div>{icon}</div>

      <div className="mt-4 text-2xl font-bold">
        {value}
      </div>

      <div className="text-sm text-gray-500">
        {title}
      </div>
    </div>
  );
}