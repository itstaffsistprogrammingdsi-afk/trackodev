import { useMemo } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Clock3,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Avatar from "@/components/ui/avatar/Avatar";
import PageHeader from "@/components/layout/PageHeader";
import { useVirtualOffice } from "@/features/virtual-office/hooks/useVirtualOffice";
import type {
  VirtualOfficeDivision,
  VirtualOfficeUser,
} from "@/features/virtual-office/types";
import { getLocale } from "@/i18n/translate";
import { resolveStorageUrl } from "@/lib/storageUrl";

function formatTime(value: string) {
  return new Intl.DateTimeFormat(getLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function MemberAvatar({ member }: { member: VirtualOfficeUser }) {
  return (
    <Avatar
      src={resolveStorageUrl(member.avatar)}
      name={member.name}
      alt={`Avatar ${member.name}`}
      size="medium"
      status="online"
    />
  );
}

function OnlineUserTile({ member }: { member: VirtualOfficeUser }) {
  const { t } = useLanguage();

  return (
    <li className="flex min-w-0 items-center gap-3 rounded-control border border-line bg-surface px-3 py-2.5">
      <MemberAvatar member={member} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-fg">
          {member.name}
          {member.is_current_user ? (
            <span className="ml-1.5 rounded bg-accent-soft px-1.5 py-0.5 text-2xs font-medium text-accent">
              {t("Kamu", "You")}
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 truncate text-xs text-fg-muted">
          {member.role_label}
        </p>
      </div>
    </li>
  );
}

function DivisionCard({
  division,
  showDivisionLink,
}: {
  division: VirtualOfficeDivision;
  showDivisionLink: boolean;
}) {
  const { t } = useLanguage();

  return (
    <section
      aria-labelledby={`division-${division.id}`}
      className="overflow-hidden rounded-panel border border-line bg-surface dark:border-line dark:bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 dark:border-line sm:px-5">
        <div className="min-w-0">
          <h2
            id={`division-${division.id}`}
            className="truncate text-base font-semibold text-fg dark:text-fg"
          >
            {division.name}
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted dark:text-fg-subtle">
            {division.code && division.code !== division.name ? `${division.code} · ` : ""}
            {t("{count} orang online", "{count} online", { count: division.online_count })}
          </p>
        </div>
        {showDivisionLink && (
          <Link
            to={`/divisions/${division.id}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-line px-3 text-xs font-medium text-fg-muted transition hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:border-line-strong text-fg-muted dark:hover:bg-surface-muted"
          >
            {t("Buka divisi", "Open division")}
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>
      <ul className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {division.users.map((member) => (
          <OnlineUserTile key={`${division.id}-${member.id}`} member={member} />
        ))}
      </ul>
    </section>
  );
}

function UnassignedCard({ users }: { users: VirtualOfficeUser[] }) {
  const { t } = useLanguage();

  return (
    <section
      aria-labelledby="division-unassigned"
      className="overflow-hidden rounded-panel border border-line bg-surface dark:border-line dark:bg-surface"
    >
      <div className="border-b border-line px-4 py-3.5 dark:border-line sm:px-5">
        <h2
          id="division-unassigned"
          className="text-base font-semibold text-fg dark:text-fg"
        >
          {t("Tanpa divisi", "No division")}
        </h2>
        <p className="mt-0.5 text-xs text-fg-muted dark:text-fg-subtle">
          {t("{count} orang online · belum terdaftar di divisi mana pun", "{count} online · not assigned to any division", { count: users.length })}
        </p>
      </div>
      <ul className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {users.map((member) => (
          <OnlineUserTile key={`unassigned-${member.id}`} member={member} />
        ))}
      </ul>
    </section>
  );
}

function LoadingState() {
  const { t } = useLanguage();

  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <p className="text-sm text-fg-muted dark:text-fg-subtle">{t("Memuat kehadiran tim…", "Loading team presence…")}</p>
      {[0, 1].map((card) => (
        <div
          key={card}
          className="overflow-hidden rounded-panel border border-line bg-surface dark:border-line dark:bg-surface"
        >
          <div className="h-16 animate-pulse border-b border-line bg-surface-muted dark:border-line dark:bg-surface-muted" />
          <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((tile) => (
              <div
                key={tile}
                className="h-16 animate-pulse rounded-control bg-surface-muted dark:bg-surface-muted"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  onRetry,
  isRetrying,
}: {
  onRetry: () => void;
  isRetrying: boolean;
}) {
  const { t } = useLanguage();

  return (
    <div
      role="alert"
      className="rounded-panel border border-danger/20 bg-danger-soft p-5 dark:border-danger/20 dark:bg-danger-soft"
    >
      <p className="font-medium text-danger text-danger">
        {t("Daftar kehadiran gagal dimuat.", "Failed to load the presence list.")}
      </p>
      <p className="mt-1 text-sm leading-6 text-danger text-danger">
        {t("Periksa koneksi lalu coba lagi. Status online tidak berubah sampai data berhasil dimuat.", "Check your connection and try again. Online status stays unchanged until the data loads.")}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-control border border-danger/30 bg-surface px-3.5 text-sm font-medium text-danger transition hover:bg-danger-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/30 focus-visible:ring-offset-2 disabled:opacity-60 dark:border-danger/20 dark:bg-danger-soft text-danger dark:hover:bg-danger-soft"
      >
        <RefreshCw
          size={15}
          className={isRetrying ? "animate-spin" : undefined}
          aria-hidden="true"
        />
        {isRetrying ? t("Mencoba lagi…", "Retrying…") : t("Coba lagi", "Try again")}
      </button>
    </div>
  );
}

function EmptyState() {
  const { t } = useLanguage();

  return (
    <div className="rounded-panel border border-dashed border-line-strong bg-surface p-8 text-center dark:border-line-strong dark:bg-surface">
      <Users size={28} className="mx-auto text-fg-subtle" aria-hidden="true" />
      <p className="mt-3 font-medium text-fg">
        {t("Belum ada rekan yang online.", "No teammates are online yet.")}
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-fg-muted dark:text-fg-subtle">
        {t("Kehadiran diperiksa secara otomatis. Status rekan akan muncul di sini saat mereka membuka Traco.", "Presence is checked automatically. Teammates appear here when they open Traco.")}
      </p>
    </div>
  );
}

export default function VirtualOfficePage() {
  const { user, can } = useAuth();
  const { t } = useLanguage();
  const isSuperAdmin = user?.roles?.includes("super_admin") ?? false;
  const hasDashboard = isSuperAdmin || can("dashboard.view");
  const homePath = hasDashboard ? "/dashboard" : "/my-work";
  const { data, isLoading, isError, isFetching, refetch } = useVirtualOffice();

  const currentMember = useMemo(() => {
    if (!data || !user?.id) {
      return undefined;
    }

    return [...data.divisions.flatMap((division) => division.users), ...data.unassigned.users].find(
      (member) => member.id === user.id,
    );
  }, [data, user?.id]);

  const canOpenDivision = can("workspace.view");
  const showData = Boolean(data) && !isError;
  const heartbeatSeconds = data?.heartbeat_interval_seconds ?? 45;
  const offlineAfterMinutes = Math.max(
    1,
    Math.round((data?.online_ttl_seconds ?? 120) / 60),
  );
  const showShortcuts = can("chat.view") || can("workspace.view");

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-5 pb-8">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <BriefcaseBusiness size={12} aria-hidden="true" />
            {t("Ruang kolaborasi", "Collaboration space")}
          </span>
        }
        title={t("Virtual Office")}
        description={t("Rekan yang sedang online, dikelompokkan per divisi. Halaman ini diperbarui otomatis.", "Teammates who are online, grouped by division. This page updates automatically.")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-9 items-center gap-2 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted"
              aria-live="polite"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isError
                    ? "bg-danger"
                    : data
                      ? "bg-success"
                      : "bg-fg-subtle"
                }`}
                aria-hidden="true"
              />
              {isError
                ? t("Kehadiran tidak tersedia", "Presence unavailable")
                : data
                  ? t("{count} orang online", "{count} online", { count: data.total_online })
                  : t("Menyinkronkan…", "Syncing…")}
            </span>

            <Link
              to={homePath}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              {t("Kembali ke {target}", "Back to {target}", {
                target: hasDashboard ? "Dashboard" : "My Work",
              })}
            </Link>
          </div>
        }
      />

      {data && !isError && (
        <section
          className="flex items-start gap-3 rounded-control border border-info/15 bg-info-soft px-4 py-3 text-sm text-info dark:border-line-strong dark:bg-surface dark:text-fg-subtle"
          aria-label={t("Cakupan akses", "Access scope")}
        >
          <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="leading-6">
            {data.access_scope === "all"
              ? t("Kamu memiliki akses lintas divisi, jadi seluruh rekan online ditampilkan.", "You have cross-division access, so all online teammates are shown.")
              : t("Kamu melihat rekan online dari divisi tempat kamu terdaftar.", "You see online teammates from the divisions you belong to.")}
          </p>
        </section>
      )}

      <section
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"
        aria-label={t("Kehadiran virtual office", "Virtual office presence")}
      >
        <div className="space-y-4">
          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
          ) : data ? (
            <>
              {data.divisions.map((division) => (
                <DivisionCard
                  key={division.id}
                  division={division}
                  showDivisionLink={canOpenDivision}
                />
              ))}
              {data.unassigned.online_count > 0 && (
                <UnassignedCard users={data.unassigned.users} />
              )}
              {data.divisions.length === 0 && data.unassigned.online_count === 0 && (
                <EmptyState />
              )}
            </>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section
            className="rounded-panel border border-line bg-surface p-4 dark:border-line dark:bg-surface"
            aria-label={t("Status kamu", "Your status")}
          >
            <h2 className="text-sm font-semibold text-fg dark:text-fg">
              {t("Status kamu", "Your status")}
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar
                src={resolveStorageUrl(currentMember?.avatar ?? user?.avatar)}
                name={user?.name ?? t("Kamu", "You")}
                alt={`Avatar ${user?.name ?? t("Kamu", "You")}`}
                size="medium"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">
                  {user?.name ?? t("Kamu", "You")}
                </p>
                <p className="mt-0.5 text-xs text-fg-muted dark:text-fg-subtle">
                  {isError
                    ? t("Status tidak tersedia", "Status unavailable")
                    : currentMember
                      ? t("Online di Traco", "Online on Traco")
                      : isLoading
                        ? t("Menghubungkan…", "Connecting…")
                        : t("Belum tercatat online", "Not recorded online yet")}
                </p>
              </div>
            </div>
            <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-fg-muted dark:border-line dark:text-fg-subtle">
              {isError
                ? t("Tidak tersedia", "Unavailable")
                : data
                  ? data.access_scope === "all"
                    ? t("Akses lintas divisi", "Cross-division access")
                    : t("Akses divisi kamu", "Your division access")
                  : t("Menentukan cakupan akses…", "Determining access scope…")}
              {showData && currentMember ? ` · ${currentMember.role_label}` : ""}
            </p>
          </section>

          <section
            className="rounded-panel border border-line bg-surface p-4 dark:border-line dark:bg-surface"
            aria-label={t("Ringkasan kehadiran", "Presence summary")}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-fg dark:text-fg">
                {t("Ringkasan", "Summary")}
              </h2>
              {isFetching && !isLoading && !isError && (
                <span className="text-[11px] text-fg-subtle">{t("Memperbarui…", "Updating…")}</span>
              )}
            </div>

            <p className="mt-3 flex items-baseline gap-2 text-fg dark:text-fg">
              <span className="text-2xl font-semibold tabular-nums">
                {showData ? data?.total_online : "—"}
              </span>
              <span className="text-sm text-fg-muted dark:text-fg-subtle">{t("orang online", "online")}</span>
            </p>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-fg-muted dark:text-fg-subtle">{t("Divisi dengan rekan online", "Divisions with online teammates")}</dt>
                <dd className="font-medium text-fg">
                  {showData ? data?.divisions.length : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-fg-muted dark:text-fg-subtle">{t("Tanpa divisi", "No division")}</dt>
                <dd className="font-medium text-fg">
                  {showData ? data?.unassigned.online_count : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-fg-muted dark:text-fg-subtle">
                  <Clock3 size={13} aria-hidden="true" />
                  {t("Diperbarui", "Updated")}
                </dt>
                <dd className="font-medium text-fg">
                  {showData && data ? formatTime(data.generated_at) : "—"}
                </dd>
              </div>
            </dl>

            <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-fg-muted dark:border-line dark:text-fg-subtle">
              {t("Diperiksa otomatis setiap {seconds} detik. Rekan dianggap offline setelah {minutes} menit tanpa aktivitas.", "Checked automatically every {seconds} seconds. Teammates are considered offline after {minutes} minutes without activity.", {
                seconds: heartbeatSeconds,
                minutes: offlineAfterMinutes,
              })}
            </p>
          </section>

          {showShortcuts && (
            <section
              className="rounded-panel border border-line bg-surface p-4 dark:border-line dark:bg-surface"
              aria-label={t("Pintasan kerja", "Work shortcuts")}
            >
              <h2 className="text-sm font-semibold text-fg dark:text-fg">
                {t("Pintasan kerja", "Work shortcuts")}
              </h2>
              <div className="mt-3 space-y-2">
                {can("chat.view") && (
                  <Link
                    to="/chats"
                    className="flex min-h-11 items-center gap-3 rounded-control border border-line px-3 text-sm font-medium text-fg-muted transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent dark:border-line-strong text-fg-muted dark:hover:bg-surface-muted"
                  >
                    <MessageCircle size={17} className="text-accent" aria-hidden="true" />
                    {t("Buka Chat", "Open chat")}
                    <ArrowUpRight
                      size={15}
                      className="ml-auto text-fg-subtle"
                      aria-hidden="true"
                    />
                  </Link>
                )}
                {can("workspace.view") && (
                  <Link
                    to="/divisions"
                    className="flex min-h-11 items-center gap-3 rounded-control border border-line px-3 text-sm font-medium text-fg-muted transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent dark:border-line-strong text-fg-muted dark:hover:bg-surface-muted"
                  >
                    <Users size={17} className="text-accent" aria-hidden="true" />
                    {t("Lihat Divisi", "View divisions")}
                    <ArrowUpRight
                      size={15}
                      className="ml-auto text-fg-subtle"
                      aria-hidden="true"
                    />
                  </Link>
                )}
              </div>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}
