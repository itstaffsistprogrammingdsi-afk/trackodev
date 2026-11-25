import { useState } from "react";
import { ArrowRight, ArrowRightLeft, ChevronDown, ChevronUp, Inbox } from "lucide-react";

import type { ActivityItem } from "../types";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/i18n/translate";

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
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const visibleActivities = expanded ? activities : activities.slice(0, MAX_VISIBLE);

  return (
    <section className="overflow-hidden rounded-panel border border-line bg-surface shadow-e1">
      <div className="border-b border-line px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
              <ArrowRightLeft size={19} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-fg">{t("Feed aktivitas", "Activity feed")}</h2>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-fg-muted">
                  {total}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-fg-subtle">{t("Perpindahan card dan pekerjaan yang masih berjalan.", "Card movements and work still in progress.")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-line px-4 sm:px-5">
        {loading ? (
          <div className="space-y-3 py-5" aria-label={t("Memuat activity feed", "Loading activity feed")}>
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-control bg-surface-muted" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted/50 text-fg-subtle">
              <Inbox size={20} aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-medium text-fg-muted">{t("Belum ada perpindahan card", "No card movements yet")}</p>
            <p className="mt-1 text-xs text-fg-subtle">
              {t("Perpindahan antar-list pada periode ini akan tampil di sini.", "Movements between lists in this period will appear here.")}
            </p>
          </div>
        ) : (
          visibleActivities.map((activity) => (
            <MovementRow key={activity.id} activity={activity} />
          ))
        )}
      </div>

      {!loading && activities.length > MAX_VISIBLE && (
        <div className="border-t border-line px-5 py-3 text-center">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-strong"
          >
            {expanded ? (
              <>{t("Tampilkan lebih sedikit", "Show less")} <ChevronUp size={15} /></>
            ) : (
              <>
                {t("Lihat {count} aktivitas lainnya", "View {count} more activities", { count: activities.length - MAX_VISIBLE })}
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
  const { t, locale } = useLanguage();
  const movement = resolveMovement(activity);
  const userName = activity.user?.name?.trim() || "System";

  return (
    <article className="flex gap-3 py-4 sm:gap-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent ring-4 ring-surface">
        <ArrowRightLeft size={16} aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-fg-muted">
          <span className="font-semibold text-fg">{userName}</span>
          {t(" memindahkan card ", " moved card ")}
          <span className="font-semibold text-fg">{movement.cardTitle}</span>
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {movement.fromBoard && (
            <>
              <BoardBadge name={movement.fromBoard} tone="from" />
              <ArrowRight size={14} className="text-fg-subtle" aria-hidden="true" />
            </>
          )}
          {movement.toBoard ? (
            <BoardBadge name={movement.toBoard} tone="to" />
          ) : (
            <span className="text-xs text-fg-subtle">{t("Tujuan list tidak tersedia", "Destination list unavailable")}</span>
          )}
          {activity.is_ongoing && (
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success ring-1 ring-success/15">
              {t("Masih berjalan", "Still in progress")}
            </span>
          )}
        </div>
      </div>

      <time
        dateTime={activity.created_at}
        className="hidden shrink-0 pt-0.5 text-right text-xs text-fg-subtle sm:block"
      >
        {formatActivityTime(activity.created_at, locale)}
      </time>
    </article>
  );
}

function BoardBadge({ name, tone }: { name: string; tone: "from" | "to" }) {
  return (
    <span
      className={`max-w-full truncate rounded-full px-2.5 py-1 text-xs font-medium ${
        tone === "to"
          ? "bg-accent-soft text-accent-strong ring-1 ring-accent/15"
          : "bg-surface-muted text-fg-muted"
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
    return { cardTitle: cardTitle ?? translate("Tanpa judul", "Untitled"), fromBoard, toBoard };
  }

  const legacy = activity.description.match(
    /Memindahkan card '(.+?)'(?: dari board '(.+?)')? ke board '(.+?)'/i,
  );

  return {
    cardTitle: legacy?.[1] ?? translate("Tanpa judul", "Untitled"),
    fromBoard: legacy?.[2] ?? null,
    toBoard: legacy?.[3] ?? null,
  };
}

function readMeta(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatActivityTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
