import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Inbox,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notification/api/notification.api";
import {
  getNotificationTargetPath,
  type AppNotification,
} from "@/features/notification/types";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { acquireEcho, releaseEcho } from "@/lib/echo";
import { REALTIME_DATA_CHANGED_EVENT } from "@/lib/realtimeEvents";
import {
  APP_RESUMED_EVENT,
  showNativeNotification,
} from "@/lib/mobileApp";

export default function NotificationBell() {
  const { user, can } = useAuth();
  const { t } = useLanguage();
  const canViewNotifications = can("notification.view");
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<
    AppNotification[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const dropdownRef =
    useRef<HTMLDivElement>(null);
  const panelRef =
    useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!canViewNotifications) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response =
        await getNotifications();

      setNotifications(response.data ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [canViewNotifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user?.id || !canViewNotifications) {
      return;
    }

    const echo = acquireEcho();

    if (!echo) {
      return;
    }

    const channelName = `users.${user.id}`;

    echo.private(channelName).listen(
      ".notification.created",
      (event: { notification: AppNotification }) => {
        const incoming = event.notification;

        setNotifications((current) => [
          incoming,
          ...current.filter((item) => item.id !== incoming.id),
        ]);
        void showNativeNotification(incoming);
      }
    ).error((error: unknown) => {
      console.error("Notification channel authorization failed", error);
    }).subscribed(() => {
      void loadNotifications();
    });

    return () => {
      echo.leave(channelName);
      releaseEcho(echo);
    };
  }, [canViewNotifications, loadNotifications, user?.id]);

  useEffect(() => {
    let refreshTimer: number | undefined;

    const refreshAfterApplicationChange = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        void loadNotifications();
      }, 5_000);
    };

    window.addEventListener(
      REALTIME_DATA_CHANGED_EVENT,
      refreshAfterApplicationChange,
    );

    return () => {
      window.clearTimeout(refreshTimer);
      window.removeEventListener(
        REALTIME_DATA_CHANGED_EVENT,
        refreshAfterApplicationChange,
      );
    };
  }, [loadNotifications]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadNotifications();
      }
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener(APP_RESUMED_EVENT, loadNotifications);

    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener(APP_RESUMED_EVENT, loadNotifications);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node
        ) &&
        !panelRef.current?.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const formatTime = (date: string) => {
    const now = new Date();
    const created = new Date(date);

    const diff =
      (now.getTime() - created.getTime()) /
      1000;

    if (diff < 60) {
      return t("Baru saja", "Just now");
    }

    if (diff < 3600) {
      return t(
        "{count} menit lalu",
        "{count} minutes ago",
        { count: Math.floor(diff / 60) },
      );
    }

    if (diff < 86400) {
      return t(
        "{count} jam lalu",
        "{count} hours ago",
        { count: Math.floor(diff / 3600) },
      );
    }

    return t(
      "{count} hari lalu",
      "{count} days ago",
      { count: Math.floor(diff / 86400) },
    );
  };

  const handleMarkAllRead =
    async () => {
      try {
        setMarkingAllRead(true);
        await markAllNotificationsRead();

        setNotifications((prev) =>
          prev.map((item) => ({
            ...item,
            is_read: true,
          }))
        );
      } catch (error) {
        console.error(error);
      } finally {
        setMarkingAllRead(false);
      }
    };

  const handleOpenNotification = (notification: AppNotification) => {
    const target = getNotificationTargetPath(notification) ?? "/notifications";

    setOpen(false);

    if (!notification.is_read) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item,
        ),
      );
      void markNotificationRead(notification.id).catch(() => loadNotifications());
    }

    navigate(target);
  };

  if (!canViewNotifications) return null;

  return (
    <div
      ref={dropdownRef}
      className="relative"
    >
      {/* Bell */}
      <button
        type="button"
        aria-label={`${t("Notifikasi", "Notifications")}, ${t("{count} belum dibaca", "{count} unread", { count: unreadCount })}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-control transition-colors hover:bg-surface-muted"
      >
        <Bell
          size={20}
          className={
            unreadCount > 0 ? "text-fg" : "text-fg-muted"
          }
        />

        {unreadCount > 0 && (
          <>
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />

            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-semibold tabular-nums text-white">
              {unreadCount > 99
                ? "99+"
                : unreadCount}
            </span>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open &&
        createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t("Daftar notifikasi", "Notification list")}
          className="fixed inset-x-0 bottom-0 z-[100] flex max-h-[min(80dvh,34rem)] w-auto flex-col overflow-hidden rounded-t-modal border border-line bg-surface shadow-e3 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-20 sm:w-[26.25rem] sm:rounded-panel"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:items-center sm:px-5">
            <div>
              <h3 className="text-sm font-semibold tracking-heading text-fg">
                {t("Notifikasi", "Notifications")}
              </h3>

              <p className="mt-0.5 text-2xs text-fg-subtle">
                {t("{count} belum dibaca", "{count} unread", {
                  count: unreadCount,
                })}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={
                  handleMarkAllRead
                }
                disabled={markingAllRead}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control px-2 py-1.5 text-2xs font-medium text-accent transition-colors hover:bg-accent-soft disabled:cursor-wait disabled:opacity-60 sm:gap-2"
              >
                {markingAllRead ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCheck size={16} />
                )}
                <span className="hidden xsm:inline">
                  {markingAllRead
                    ? t("Memproses...", "Processing...")
                    : t("Tandai semua dibaca", "Mark all as read")}
                </span>
              </button>
            )}
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="p-6 text-center text-xs text-fg-muted">
                {t("Memuat notifikasi…", "Loading notifications…")}
              </div>
            ) : notifications.length ===
              0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-fg-subtle">
                  <Inbox size={22} aria-hidden="true" />
                </span>

                <h4 className="mt-3 text-sm font-medium text-fg">
                  {t("Belum ada notifikasi", "No notifications yet")}
                </h4>

                <p className="mt-1 text-center text-xs text-fg-muted">
                  {t(
                    "Semua notifikasi baru akan muncul di sini.",
                    "New notifications will appear here.",
                  )}
                </p>
              </div>
            ) : (
              notifications.map(
                (notification) => (
                  <button
                    key={
                      notification.id
                    }
                    type="button"
                    onClick={() => handleOpenNotification(notification)}
                    aria-label={`${notification.title}. ${notification.action_label ?? t("Buka notifikasi", "Open notification")}`}
                    className={`w-full border-b border-line px-4 py-3.5 text-left transition-colors hover:bg-surface-muted/60 sm:px-5 ${
                      !notification.is_read ? "bg-accent-soft/40" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {!notification.is_read && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                          <h4 className="break-words text-xs font-medium text-fg sm:truncate">
                            {
                              notification.title
                            }
                          </h4>

                          <span className="whitespace-nowrap text-2xs text-fg-subtle">
                            {formatTime(
                              notification.created_at
                            )}
                          </span>
                        </div>

                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-fg-muted">
                          {
                            notification.body
                          }
                        </p>

                        {notification.action_url ? (
                          <span className="mt-1.5 inline-flex items-center gap-1 text-2xs font-medium text-accent">
                            {notification.action_label ?? t("Buka card", "Open card")}
                            <ExternalLink size={11} aria-hidden="true" />
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                )
              )
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-line px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2.5 sm:py-2.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
              className="w-full rounded-control py-1.5 text-center text-xs font-medium text-accent transition-colors hover:bg-accent-soft"
            >
              {t("Lihat semua notifikasi", "View all notifications")}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
