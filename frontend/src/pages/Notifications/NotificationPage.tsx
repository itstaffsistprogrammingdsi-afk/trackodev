import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, ExternalLink, Inbox, Loader2, Trash2 } from "lucide-react";
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

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function NotificationPage() {
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
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl">
      <header className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
            <Bell size={21} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Notifications
            </h1>
            <p className="text-sm text-slate-500">{unreadCount} belum dibaca</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={markingAllRead}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-70"
          >
            {markingAllRead ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <CheckCheck size={17} />
            )}
            {markingAllRead ? "Memproses..." : "Tandai semua dibaca"}
          </button>
        )}
      </header>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Memuat notifikasi...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <Inbox className="text-slate-300" size={44} />
            <h2 className="mt-4 font-semibold text-slate-800 dark:text-slate-100">
              Belum ada notifikasi
            </h2>
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className={`flex min-w-0 items-start gap-2 px-4 py-4 transition sm:gap-3 sm:px-7 ${
                item.is_read
                  ? "bg-white dark:bg-slate-900"
                  : "bg-indigo-50/60 dark:bg-indigo-950/20"
              }`}
            >
              <button
                type="button"
                onClick={() => openNotification(item)}
                aria-label={`${item.title}. ${item.action_label ?? "Tandai sudah dibaca"}`}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  {!item.is_read && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                  )}
                  <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </h2>
                </div>
                <p className="mt-1 break-words text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {item.body}
                </p>
                <time className="mt-2 block text-xs text-slate-400">
                  {formatDate(item.created_at)}
                </time>
                {item.action_url ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                    {item.action_label ?? "Buka card"}
                    <ExternalLink size={12} aria-hidden="true" />
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => void remove(item.id)}
                aria-label={`Hapus notifikasi ${item.title}`}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
              >
                <Trash2 size={17} />
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
