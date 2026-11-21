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
import { useVirtualOffice } from "@/features/virtual-office/hooks/useVirtualOffice";
import type {
  VirtualOfficeDivision,
  VirtualOfficeUser,
} from "@/features/virtual-office/types";
import { resolveStorageUrl } from "@/lib/storageUrl";

const avatarColors = ["#718a78", "#b78262", "#71899a", "#aa8a65", "#8b7996", "#668f91"];

function initialsFor(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

function colorFor(name: string) {
  let hash = 0;

  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 997;
  }

  return avatarColors[hash % avatarColors.length];
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function MemberAvatar({ member, size = 40 }: { member: VirtualOfficeUser; size?: number }) {
  const avatarUrl = resolveStorageUrl(member.avatar);

  return (
    <span
      className="relative block shrink-0 overflow-hidden rounded-xl bg-[#718a78]"
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: colorFor(member.name) }}
        >
          {initialsFor(member.name)}
        </span>
      )}
      <span
        className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900"
        aria-hidden="true"
      />
    </span>
  );
}

function OnlineUserTile({ member }: { member: VirtualOfficeUser }) {
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950/40">
      <MemberAvatar member={member} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
          {member.name}
          {member.is_current_user && (
            <span className="ml-1.5 rounded bg-[#e9f1e8] px-1.5 py-0.5 text-[10px] font-semibold text-[#496451] dark:bg-[#496451]/25 dark:text-[#a9c7b1]">
              Kamu
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
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
  return (
    <section
      aria-labelledby={`division-${division.id}`}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800 sm:px-5">
        <div className="min-w-0">
          <h2
            id={`division-${division.id}`}
            className="truncate text-base font-semibold text-slate-900 dark:text-white"
          >
            {division.name}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {division.code && division.code !== division.name ? `${division.code} · ` : ""}
            {division.online_count} orang online
          </p>
        </div>
        {showDivisionLink && (
          <Link
            to={`/divisions/${division.id}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#607c66] focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Buka divisi
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
  return (
    <section
      aria-labelledby="division-unassigned"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="border-b border-slate-200 px-4 py-3.5 dark:border-slate-800 sm:px-5">
        <h2
          id="division-unassigned"
          className="text-base font-semibold text-slate-900 dark:text-white"
        >
          Tanpa divisi
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {users.length} orang online · belum terdaftar di divisi mana pun
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
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <p className="text-sm text-slate-500 dark:text-slate-400">Memuat kehadiran tim…</p>
      {[0, 1].map((card) => (
        <div
          key={card}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="h-16 animate-pulse border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800" />
          <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((tile) => (
              <div
                key={tile}
                className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
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
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/60 dark:bg-red-950/30"
    >
      <p className="font-medium text-red-800 dark:text-red-200">
        Daftar kehadiran gagal dimuat.
      </p>
      <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-300">
        Periksa koneksi lalu coba lagi. Status online tidak berubah sampai data berhasil
        dimuat.
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-300 bg-white px-3.5 text-sm font-medium text-red-700 transition hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-60 dark:border-red-800 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900"
      >
        <RefreshCw
          size={15}
          className={isRetrying ? "animate-spin" : undefined}
          aria-hidden="true"
        />
        {isRetrying ? "Mencoba lagi…" : "Coba lagi"}
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
      <Users size={28} className="mx-auto text-slate-400" aria-hidden="true" />
      <p className="mt-3 font-medium text-slate-800 dark:text-slate-100">
        Belum ada rekan yang online.
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
        Kehadiran diperiksa secara otomatis. Status rekan akan muncul di sini saat mereka
        membuka Traco.
      </p>
    </div>
  );
}

export default function VirtualOfficePage() {
  const { user, can } = useAuth();
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
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="mt-1 hidden h-10 w-10 items-center justify-center rounded-xl bg-[#e9f1e8] text-[#496451] sm:flex dark:bg-[#496451]/20 dark:text-[#a9c7b1]"
            aria-hidden="true"
          >
            <BriefcaseBusiness size={19} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Ruang kolaborasi Traco
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Virtual Office
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Rekan yang sedang online, dikelompokkan per divisi. Halaman ini diperbarui
              otomatis.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            aria-live="polite"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isError
                  ? "bg-rose-500"
                  : data
                    ? "bg-emerald-500"
                    : "bg-slate-300 dark:bg-slate-600"
              }`}
              aria-hidden="true"
            />
            {isError
              ? "Kehadiran tidak tersedia"
              : data
                ? `${data.total_online} orang online`
                : "Menyinkronkan…"}
          </span>
          <Link
            to={homePath}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#607c66] focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Kembali ke {hasDashboard ? "Dashboard" : "My Work"}
          </Link>
        </div>
      </header>

      {data && !isError && (
        <section
          className="flex items-start gap-3 rounded-xl border border-[#d8ded5] bg-[#eef3ea] px-4 py-3 text-sm text-[#3f5a45] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          aria-label="Cakupan akses"
        >
          <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="leading-6">
            {data.access_scope === "all"
              ? "Kamu memiliki akses lintas divisi, jadi seluruh rekan online ditampilkan."
              : "Kamu melihat rekan online dari divisi tempat kamu terdaftar."}
          </p>
        </section>
      )}

      <section
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"
        aria-label="Kehadiran virtual office"
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
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            aria-label="Status kamu"
          >
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Status kamu
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#718a78]">
                {resolveStorageUrl(currentMember?.avatar ?? user?.avatar) ? (
                  <img
                    src={resolveStorageUrl(currentMember?.avatar ?? user?.avatar)}
                    alt=""
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {initialsFor(user?.name ?? "Kamu")}
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {user?.name ?? "Kamu"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {isError
                    ? "Status tidak tersedia"
                    : currentMember
                      ? "Online di Traco"
                      : isLoading
                        ? "Menghubungkan…"
                        : "Belum tercatat online"}
                </p>
              </div>
            </div>
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {isError
                ? "Tidak tersedia"
                : data
                  ? data.access_scope === "all"
                    ? "Akses lintas divisi"
                    : "Akses divisi kamu"
                  : "Menentukan cakupan akses…"}
              {showData && currentMember ? ` · ${currentMember.role_label}` : ""}
            </p>
          </section>

          <section
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            aria-label="Ringkasan kehadiran"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Ringkasan
              </h2>
              {isFetching && !isLoading && !isError && (
                <span className="text-[11px] text-slate-400">Memperbarui…</span>
              )}
            </div>

            <p className="mt-3 flex items-baseline gap-2 text-slate-900 dark:text-white">
              <span className="text-3xl font-semibold">
                {showData ? data?.total_online : "—"}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">orang online</span>
            </p>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Divisi dengan rekan online</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">
                  {showData ? data?.divisions.length : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Tanpa divisi</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">
                  {showData ? data?.unassigned.online_count : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Clock3 size={13} aria-hidden="true" />
                  Diperbarui
                </dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">
                  {showData && data ? formatTime(data.generated_at) : "—"}
                </dd>
              </div>
            </dl>

            <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Diperiksa otomatis setiap {heartbeatSeconds} detik. Rekan dianggap offline
              setelah {offlineAfterMinutes} menit tanpa aktivitas.
            </p>
          </section>

          {showShortcuts && (
            <section
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              aria-label="Pintasan kerja"
            >
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Pintasan kerja
              </h2>
              <div className="mt-3 space-y-2">
                {can("chat.view") && (
                  <Link
                    to="/chats"
                    className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#607c66] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <MessageCircle size={17} className="text-[#607c66]" aria-hidden="true" />
                    Buka Chat
                    <ArrowUpRight
                      size={15}
                      className="ml-auto text-slate-400"
                      aria-hidden="true"
                    />
                  </Link>
                )}
                {can("workspace.view") && (
                  <Link
                    to="/divisions"
                    className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#607c66] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Users size={17} className="text-[#607c66]" aria-hidden="true" />
                    Lihat Divisi
                    <ArrowUpRight
                      size={15}
                      className="ml-auto text-slate-400"
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
