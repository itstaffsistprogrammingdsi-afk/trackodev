import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Inbox,
  Loader2,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router";

import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notification/api/notification.api";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import {
  getNotificationTargetPath,
  type AppNotification,
} from "@/features/notification/types";
import { useLanguage } from "@/context/LanguageContext";
import { getLocale } from "@/i18n/translate";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function NotificationPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const realtimeRevision = useRealtimeRevision(["Notification"]);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await getNotifications();
      setItems(response.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications, realtimeRevision]);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items],
  );

  const markRead = async (item: AppNotification) => {
    if (item.is_read) return;

    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, is_read: true } : entry,
      ),
    );

    try {
      await markNotificationRead(item.id);
    } catch {
      void loadNotifications();
    }
  };

  const openNotification = (item: AppNotification) => {
    const target = getNotificationTargetPath(item);
    void markRead(item);
    if (target) navigate(target);
  };

  const markAllRead = async () => {
    try {
      setMarkingAllRead(true);
      await markAllNotificationsRead();
      setItems((current) =>
        current.map((item) => ({ ...item, is_read: true })),
      );
    } finally {
      setMarkingAllRead(false);
    }
  };

  const remove = async (id: string) => {
    await deleteNotification(id);
    setItems((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <section className="overflow-hidden rounded-panel border border-line bg-surface shadow-e1">
        <header className="flex flex-col gap-4 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 place-items-center rounded-control bg-accent-soft text-accent">
              <Bell size={17} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-sm font-semibold tracking-heading text-fg">
                {t("Notifikasi", "Notifications")}
              </h1>
              <p className="text-2xs text-fg-subtle">
                {unreadCount > 0
                  ? t("{count} belum dibaca", "{count} unread", {
                      count: unreadCount,
                    })
                  : t("Semua sudah dibaca", "All read")}
              </p>
            </div>
          </div>

          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={markingAllRead}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-accent px-3 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-wait disabled:opacity-70"
            >
              {markingAllRead ? (
                <Loader2
                  size={14}
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <CheckCheck size={14} aria-hidden="true" />
              )}
              {markingAllRead
                ? t("Memproses…", "Processing…")
                : t("Tandai semua dibaca", "Mark all as read")}
            </button>
          ) : null}
        </header>

        <div className="divide-y divide-line">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-xs text-fg-muted">
              <Loader2
                size={14}
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              {t("Memuat notifikasi…", "Loading notifications…")}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-fg-subtle">
                <Inbox size={22} aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-sm font-medium text-fg">
                {t("Belum ada notifikasi", "No notifications yet")}
              </h2>
              <p className="mt-1 max-w-sm text-xs text-fg-muted">
                {t(
                  "Pemberitahuan tentang task, komentar, dan campaign akan muncul di sini.",
                  "Notifications about tasks, comments, and campaigns will appear here.",
                )}
              </p>
            </div>
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className={`flex min-w-0 items-start gap-2 px-4 py-3.5 transition-colors sm:gap-3 sm:px-5 ${
                  item.is_read ? "bg-surface" : "bg-accent-soft/30"
                }`}
              >
                <button
                  type="button"
                  onClick={() => openNotification(item)}
                  aria-label={`${item.title}. ${item.action_label ?? t("Tandai sudah dibaca", "Mark as read")}`}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    {!item.is_read ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    ) : null}
                    <h2 className="truncate text-xs font-medium text-fg">
                      {item.title}
                    </h2>
                  </div>
                  <p className="mt-1 break-words text-xs leading-5 text-fg-muted">
                    {item.body}
                  </p>
                  <time className="mt-1.5 block text-2xs text-fg-subtle">
                    {formatDate(item.created_at)}
                  </time>
                  {item.action_url ? (
                    <span className="mt-1.5 inline-flex items-center gap-1 text-2xs font-medium text-accent">
                      {item.action_label ?? t("Buka card", "Open card")}
                      <ExternalLink size={11} aria-hidden="true" />
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => void remove(item.id)}
                  aria-label={t("Hapus notifikasi {title}", "Delete notification {title}", {
                    title: item.title,
                  })}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
