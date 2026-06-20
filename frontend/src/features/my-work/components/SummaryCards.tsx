import {
  CheckCircle2,
  ClipboardList,
  Activity,
  TrendingUp,
} from "lucide-react";

type Props = {
  totalCards: number;
  completedCards: number;
  completionRate: number;
  totalActivities: number;
};

export default function SummaryCards({
  totalCards,
  completedCards,
  completionRate,
  totalActivities,
}: Props) {
  const safeRate = Number.isFinite(completionRate)
    ? completionRate
    : 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

      <SummaryCard
        title="Total Tasks"
        value={totalCards ?? 0}
        description="Assigned tasks"
        icon={
          <ClipboardList
            size={20}
            className="text-blue-600"
          />
        }
        bg="bg-blue-50"
      />

      <SummaryCard
        title="Completed"
        value={completedCards ?? 0}
        description="Finished tasks"
        icon={
          <CheckCircle2
            size={20}
            className="text-green-600"
          />
        }
        bg="bg-green-50"
      />

      <SummaryCard
        title="Completion Rate"
        value={`${safeRate.toFixed(1)}%`}
        description="Productivity score"
        icon={
          <TrendingUp
            size={20}
            className="text-purple-600"
          />
        }
        bg="bg-purple-50"
      />

      <SummaryCard
        title="Activities"
        value={totalActivities ?? 0}
        description="Recent actions"
        icon={
          <Activity
            size={20}
            className="text-orange-600"
          />
        }
        bg="bg-orange-50"
      />

    </div>
  );
}

type SummaryCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  bg: string;
};

function SummaryCard({
  title,
  value,
  description,
  icon,
  bg,
}: SummaryCardProps) {
  return (
    <div
      className="
        group
        rounded-3xl
        border
        border-gray-200
        bg-white
        p-5
        shadow-sm
        transition-all
        hover:-translate-y-1
        hover:shadow-lg
      "
    >
      <div className="flex items-start justify-between">

        <div>
          <p className="text-sm text-gray-500">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-bold text-gray-900">
            {value ?? 0}
          </h3>

          <p className="mt-1 text-xs text-gray-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${bg}`}
        >
          {icon}
        </div>

      </div>
    </div>
  );
}