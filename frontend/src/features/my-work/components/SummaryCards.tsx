import {
  CheckCircle2,
  ClipboardList,
  TrendingUp,
} from "lucide-react";

type Props = {
  totalCards: number;
  completedCards: number;
  completionRate: number;
  loading?: boolean;
};

export default function SummaryCards({
  totalCards,
  completedCards,
  completionRate,
  loading = false,
}: Props) {
  const safeRate = Number.isFinite(completionRate)
    ? completionRate
    : 0;

  return (
    <div className={`grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 md:grid-cols-3 ${loading ? "opacity-60" : "opacity-100"}`} aria-busy={loading}>

      <SummaryCard
        title="Total Tasks"
        value={totalCards ?? 0}
        description="Task pada periode terpilih"
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
        description="Task berstatus selesai"
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
        description="Rasio penyelesaian task"
        icon={
          <TrendingUp
            size={20}
            className="text-purple-600"
          />
        }
        bg="bg-purple-50"
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
        rounded-2xl
        border
        border-gray-200
        bg-white
        p-5
        shadow-sm
        transition-all
        hover:border-blue-100
        hover:shadow-md
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