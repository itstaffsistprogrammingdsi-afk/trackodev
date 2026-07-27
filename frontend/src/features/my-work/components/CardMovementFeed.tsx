import { useState } from "react";
import { ArrowRight, ArrowRightLeft, ChevronDown, ChevronUp, Inbox } from "lucide-react";

import type { ActivityItem } from "../types";

type Props = {
  activities: ActivityItem[];
  total: number;
  loading?: boolean;
};

type Movement = {
  cardTitle: string;
  fromBoard: string | null;
  toBoard: string | null;
};

const MAX_VISIBLE = 6;

export default function CardMovementFeed({
  activities,
  total,
  loading = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const visibleActivities = expanded ? activities : activities.slice(0, MAX_VISIBLE);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ArrowRightLeft size={19} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">Activity Feed</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {total}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">Perpindahan card dan pekerjaan yang masih berjalan.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100 px-4 sm:px-5">
        {loading ? (
          <div className="space-y-3 py-5" aria-label="Memuat activity feed">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-400">
              <Inbox size={20} aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-medium text-gray-700">Belum ada perpindahan card</p>
            <p className="mt-1 text-xs text-gray-400">
              Perpindahan antar-list pada periode ini akan tampil di sini.
            </p>
          </div>
        ) : (
          visibleActivities.map((activity) => (
            <MovementRow key={activity.id} activity={activity} />
          ))
        )}
      </div>

      {!loading && activities.length > MAX_VISIBLE && (
        <div className="border-t border-gray-100 px-5 py-3 text-center">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
          >
            {expanded ? (
              <>Tampilkan lebih sedikit <ChevronUp size={15} /></>
            ) : (
              <>
                Lihat {activities.length - MAX_VISIBLE} aktivitas lainnya
                <ChevronDown size={15} />
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}

function MovementRow({ activity }: { activity: ActivityItem }) {
  const movement = resolveMovement(activity);
  const userName = activity.user?.name?.trim() || "System";

  return (
    <article className="flex gap-3 py-4 sm:gap-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-4 ring-white">
        <ArrowRightLeft size={16} aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{userName}</span>
          {" memindahkan card "}
          <span className="font-semibold text-gray-900">{movement.cardTitle}</span>
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {movement.fromBoard && (
            <>
              <BoardBadge name={movement.fromBoard} tone="from" />
              <ArrowRight size={14} className="text-gray-400" aria-hidden="true" />
            </>
          )}
          {movement.toBoard ? (
            <BoardBadge name={movement.toBoard} tone="to" />
          ) : (
            <span className="text-xs text-gray-400">Tujuan list tidak tersedia</span>
          )}
          {activity.is_ongoing && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              Masih berjalan
            </span>
          )}
        </div>
      </div>

      <time
        dateTime={activity.created_at}
        className="hidden shrink-0 pt-0.5 text-right text-xs text-gray-400 sm:block"
      >
        {formatActivityTime(activity.created_at)}
      </time>
    </article>
  );
}

function BoardBadge({ name, tone }: { name: string; tone: "from" | "to" }) {
  return (
    <span
      className={`max-w-full truncate rounded-full px-2.5 py-1 text-xs font-medium ${
        tone === "to"
          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
          : "bg-gray-100 text-gray-600"
      }`}
      title={name}
    >
      {name}
    </span>
  );
}

function resolveMovement(activity: ActivityItem): Movement {
  const meta = activity.meta ?? {};
  const cardTitle = readMeta(meta, "card_title");
  const fromBoard = readMeta(meta, "from_board_name");
  const toBoard = readMeta(meta, "to_board_name");

  if (cardTitle || fromBoard || toBoard) {
    return { cardTitle: cardTitle ?? "Tanpa judul", fromBoard, toBoard };
  }

  const legacy = activity.description.match(
    /Memindahkan card '(.+?)'(?: dari board '(.+?)')? ke board '(.+?)'/i,
  );

  return {
    cardTitle: legacy?.[1] ?? "Tanpa judul",
    fromBoard: legacy?.[2] ?? null,
    toBoard: legacy?.[3] ?? null,
  };
}

function readMeta(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatActivityTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
