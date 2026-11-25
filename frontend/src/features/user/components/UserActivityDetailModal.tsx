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
import { useLanguage } from "@/context/LanguageContext";
import { getLocale, translate } from "@/i18n/translate";

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
  if (!value) return translate("Belum tercatat", "Not recorded");

  return new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const passwordActionLabel: Record<
  PasswordHistoryItem["action"],
  { label: string; labelEn: string }
> = {
  password_changed: { label: "Diubah oleh user", labelEn: "Changed by user" },
  password_recovery: { label: "Pemulihan password", labelEn: "Password recovery" },
  password_reset: { label: "Direset Super Admin", labelEn: "Reset by Super Admin" },
};

export default function UserActivityDetailModal({ user, onClose }: Props) {
  const { t } = useLanguage();
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
          setError(
            t(
              "Detail aktivitas user gagal dimuat.",
              "Failed to load user activity details.",
            ),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [t, userId]);

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
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
        aria-label={t("Tutup detail user", "Close user details")}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-activity-title"
        className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-modal bg-surface shadow-e3 dark:bg-surface"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-surface px-6 py-5 dark:border-line dark:bg-surface">
          <div>
            <h2 id="user-activity-title" className="text-xl font-semibold text-fg dark:text-white">
              {t("Detail aktivitas user", "User activity details")}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              {user.name} · {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-control text-fg-muted hover:bg-surface-muted dark:hover:bg-surface-muted"
            aria-label={t("Tutup", "Close")}
          >
            <X size={20} />
          </button>
        </header>

        <div className="space-y-6 p-6">
          {loading ? (
            <div className="flex min-h-52 items-center justify-center">
              <Loader2 className="animate-spin text-accent" />
            </div>
          ) : error ? (
            <p className="rounded-card bg-danger-soft p-4 text-sm text-danger dark:bg-danger-soft/10 dark:text-danger">
              {error}
            </p>
          ) : detail ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  icon={<Download size={20} />}
                  label={t("Download report", "Report downloads")}
                  value={detail.stats.report_downloads}
                />
                <StatCard
                  icon={<KeyRound size={20} />}
                  label={t("Perubahan password", "Password changes")}
                  value={detail.stats.password_changes}
                />
                <StatCard
                  icon={<ShieldCheck size={20} />}
                  label={t("Password terakhir diubah", "Last password change")}
                  value={formatDateTime(detail.stats.last_password_changed_at)}
                  compact
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <AuditList title={t("Riwayat password", "Password history")} icon={<KeyRound size={18} />}>
                  {detail.password_history.length === 0 ? (
                    <EmptyState
                      text={t(
                        "Belum ada perubahan password yang tercatat.",
                        "No password changes recorded yet.",
                      )}
                    />
                  ) : (
                    detail.password_history.map((item) => (
                      <li key={item.id} className="rounded-card border border-line p-4 dark:border-line">
                        <p className="font-medium text-fg dark:text-white">
                          {t(
                            passwordActionLabel[item.action].label,
                            passwordActionLabel[item.action].labelEn,
                          )}
                        </p>
                        <p className="mt-1 text-sm text-fg-muted">
                          {t("Pelaku: {name}", "Performed by: {name}", {
                            name: item.performed_by?.name ?? t("Sistem", "System"),
                          })}
                        </p>
                        <p className="mt-1 text-xs text-fg-subtle">
                          {t("Tanggal & waktu: {date}", "Date & time: {date}", {
                            date: formatDateTime(item.created_at),
                          })}
                        </p>
                      </li>
                    ))
                  )}
                </AuditList>

                <AuditList
                  title={t("Download report terbaru", "Recent report downloads")}
                  icon={<History size={18} />}
                >
                  {detail.recent_report_downloads.length === 0 ? (
                    <EmptyState
                      text={t(
                        "Belum ada download report yang tercatat.",
                        "No report downloads recorded yet.",
                      )}
                    />
                  ) : (
                    detail.recent_report_downloads.map((item) => (
                      <li key={item.id} className="rounded-card border border-line p-4 dark:border-line">
                        <p className="font-medium capitalize text-fg dark:text-white">
                          {item.source.replace(/_/g, " ")} · {(item.format ?? t("file")).toUpperCase()}
                        </p>
                        <p className="mt-1 text-xs text-fg-subtle">{formatDateTime(item.created_at)}</p>
                      </li>
                    ))
                  )}
                </AuditList>
              </div>

              <p className="rounded-card border border-warning/20 bg-warning-soft p-4 text-sm leading-6 text-warning dark:border-warning/20 dark:bg-warning-soft/10 dark:text-warning">
                {t(
                  "Riwayat hanya mencatat kejadian perubahan password, pelaku, tanggal, dan waktu. Nilai password tidak disimpan dalam audit.",
                  "This history only records password change events, who performed them, and the date and time. Password values are never stored in the audit log.",
                )}
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
    <div className="rounded-card border border-line p-4 dark:border-line">
      <div className="flex items-center gap-2 text-accent text-accent">
        {icon}
        <span className="text-sm font-medium text-fg-muted">{label}</span>
      </div>
      <p className={`mt-3 font-semibold text-fg dark:text-white ${compact ? "text-sm" : "text-2xl"}`}>
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
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-fg dark:text-white">
        {icon}
        {title}
      </h3>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <li className="rounded-card bg-surface-muted/40 p-4 text-sm text-fg-muted dark:bg-surface/[0.03]">{text}</li>;
}
