import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  Inbox,
} from "lucide-react";

import {
  getNotifications,
  markAllNotificationsRead,
} from "@/features/notification/api/notification.api";
import { useAuth } from "@/context/AuthContext";
import { createEcho } from "@/lib/echo";
import { REALTIME_DATA_CHANGED_EVENT } from "@/lib/realtimeEvents";

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<
    Notification[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const dropdownRef =
    useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
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
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const echo = createEcho();

    if (!echo) {
      return;
    }

    const channelName = `users.${user.id}`;

    echo.private(channelName).listen(
      ".notification.created",
      (event: { notification: Notification }) => {
        const incoming = event.notification;

        setNotifications((current) => [
          incoming,
          ...current.filter((item) => item.id !== incoming.id),
        ]);
      }
    ).error((error: unknown) => {
      console.error("Notification channel authorization failed", error);
    }).subscribed(() => {
      void loadNotifications();
    });

    return () => {
      echo.leave(channelName);
    };
  }, [user?.id]);

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
  }, []);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadNotifications();
      }
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () =>
      document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, []);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
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
      return "Baru saja";
    }

    if (diff < 3600) {
      return `${Math.floor(
        diff / 60
      )} menit lalu`;
    }

    if (diff < 86400) {
      return `${Math.floor(
        diff / 3600
      )} jam lalu`;
    }

    return `${Math.floor(
      diff / 86400
    )} hari lalu`;
  };

  const handleMarkAllRead =
    async () => {
      try {
        await markAllNotificationsRead();

        setNotifications((prev) =>
          prev.map((item) => ({
            ...item,
            is_read: true,
          }))
        );
      } catch (error) {
        console.error(error);
      }
    };

  return (
    <div
      ref={dropdownRef}
      className="relative"
    >
      {/* Bell */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-11 h-11 rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Bell
          size={22}
          className={
            unreadCount > 0
              ? "animate-pulse"
              : ""
          }
        />

        {unreadCount > 0 && (
          <>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />

            <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 flex items-center justify-center text-[10px] font-semibold text-white bg-red-500 rounded-full">
              {unreadCount > 99
                ? "99+"
                : unreadCount}
            </span>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute -right-3 z-50 mt-3 flex max-h-[min(34rem,calc(100dvh-6rem))] w-[min(calc(100vw-1.5rem),26.25rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900 sm:right-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-4 dark:border-gray-800 sm:items-center sm:px-5">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>

              <p className="text-xs text-gray-500">
                {unreadCount} unread
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={
                  handleMarkAllRead
                }
                className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 sm:gap-2 sm:text-sm"
              >
                <CheckCheck size={16} />
                Mark all read
              </button>
            )}
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-500">
                Loading notifications...
              </div>
            ) : notifications.length ===
              0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12">
                <Inbox
                  size={42}
                  className="text-gray-300"
                />

                <h4 className="mt-4 font-medium">
                  No notifications
                </h4>

                <p className="mt-1 text-sm text-gray-500 text-center">
                  Semua notifikasi akan
                  muncul di sini.
                </p>
              </div>
            ) : (
              notifications.map(
                (notification) => (
                  <button
                    key={
                      notification.id
                    }
                    className={`w-full text-left px-5 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 ${
                      !notification.is_read
                        ? "bg-indigo-50/60 dark:bg-indigo-900/10"
                        : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {!notification.is_read && (
                        <span className="mt-2 w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {
                              notification.title
                            }
                          </h4>

                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {formatTime(
                              notification.created_at
                            )}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {
                            notification.body
                          }
                        </p>
                      </div>
                    </div>
                  </button>
                )
              )
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800">
            <button className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
