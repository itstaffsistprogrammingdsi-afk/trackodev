import { type ReactNode, useEffect, useState } from "react";
import {
  Download,
  History,
  KeyRound,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";

import api from "@/lib/axios";

type UserSummary = {
  id: string;
  name: string;
  email: string;
};

type AuditActor = UserSummary | null;

type PasswordHistoryItem = {
  id: string;
  action: "password_changed" | "password_recovery" | "password_reset";
  description: string;
  method: string | null;
  performed_by: AuditActor;
  created_at: string | null;
};

type ReportDownloadItem = {
  id: string;
  source: string;
  format: string | null;
  period_type: string | null;
  created_at: string | null;
};

type UserActivityDetail = {
  user: UserSummary & {
    roles: string[];
    created_at: string | null;
  };
  stats: {
    report_downloads: number;
    password_changes: number;
    last_password_changed_at: string | null;
  };
  password_history: PasswordHistoryItem[];
  recent_report_downloads: ReportDownloadItem[];
};

type Props = {
  user: UserSummary | null;
  onClose: () => void;
};

const formatDateTime = (value: string | null): string => {
  if (!value) return "Belum tercatat";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const passwordActionLabel: Record<PasswordHistoryItem["action"], string> = {
  password_changed: "Diubah oleh user",
  password_recovery: "Pemulihan password",
  password_reset: "Direset Super Admin",
};

export default function UserActivityDetailModal({ user, onClose }: Props) {
  const userId = user?.id ?? null;
  const [detail, setDetail] = useState<UserActivityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      setError(null);
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    api
      .get<{ data: UserActivityDetail }>(`/users/${userId}/details`, {
        signal: controller.signal,
      })
      .then((response) => setDetail(response.data.data))
      .catch((requestError) => {
        if (requestError?.code !== "ERR_CANCELED") {
          console.error(requestError);
          setError("Detail aktivitas user gagal dimuat.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, userId]);

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Tutup detail user"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-activity-title"
        className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-gray-900"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <h2 id="user-activity-title" className="text-xl font-semibold text-gray-900 dark:text-white">
              Detail aktivitas user
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {user.name} · {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </header>

        <div className="space-y-6 p-6">
          {loading ? (
            <div className="flex min-h-52 items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          ) : detail ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  icon={<Download size={20} />}
                  label="Download report"
                  value={detail.stats.report_downloads}
                />
                <StatCard
                  icon={<KeyRound size={20} />}
                  label="Perubahan password"
                  value={detail.stats.password_changes}
                />
                <StatCard
                  icon={<ShieldCheck size={20} />}
                  label="Password terakhir diubah"
                  value={formatDateTime(detail.stats.last_password_changed_at)}
                  compact
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <AuditList title="Riwayat password" icon={<KeyRound size={18} />}>
                  {detail.password_history.length === 0 ? (
                    <EmptyState text="Belum ada perubahan password yang tercatat." />
                  ) : (
                    detail.password_history.map((item) => (
                      <li key={item.id} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {passwordActionLabel[item.action]}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Pelaku: {item.performed_by?.name ?? "Sistem"}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          Tanggal &amp; waktu: {formatDateTime(item.created_at)}
                        </p>
                      </li>
                    ))
                  )}
                </AuditList>

                <AuditList title="Download report terbaru" icon={<History size={18} />}>
                  {detail.recent_report_downloads.length === 0 ? (
                    <EmptyState text="Belum ada download report yang tercatat." />
                  ) : (
                    detail.recent_report_downloads.map((item) => (
                      <li key={item.id} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                        <p className="font-medium capitalize text-gray-900 dark:text-white">
                          {item.source.replace(/_/g, " ")} · {(item.format ?? "file").toUpperCase()}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">{formatDateTime(item.created_at)}</p>
                      </li>
                    ))
                  )}
                </AuditList>
              </div>

              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                Riwayat hanya mencatat kejadian perubahan password, pelaku, tanggal, dan waktu. Nilai password tidak disimpan dalam audit.
              </p>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
        {icon}
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className={`mt-3 font-semibold text-gray-900 dark:text-white ${compact ? "text-sm" : "text-2xl"}`}>
        {value}
      </p>
    </div>
  );
}

function AuditList({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
        {icon}
        {title}
      </h3>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <li className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-white/[0.03]">{text}</li>;
}
