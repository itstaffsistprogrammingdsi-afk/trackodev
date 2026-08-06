import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  CheckCheck,
  Inbox,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router";

import {
  getNotifications,
  markAllNotificationsRead,
} from "@/features/notification/api/notification.api";
import { useAuth } from "@/context/AuthContext";
import { createEcho } from "@/lib/echo";
import { REALTIME_DATA_CHANGED_EVENT } from "@/lib/realtimeEvents";
import {
  APP_RESUMED_EVENT,
  showNativeNotification,
} from "@/lib/mobileApp";

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<
    Notification[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const dropdownRef =
    useRef<HTMLDivElement>(null);
  const panelRef =
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
        void showNativeNotification(incoming);
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
    window.addEventListener(APP_RESUMED_EVENT, loadNotifications);

    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener(APP_RESUMED_EVENT, loadNotifications);
    };
  }, []);

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
      {open &&
        createPortal(
        <div
          ref={panelRef}
          className="fixed inset-x-0 bottom-0 z-[100] flex max-h-[min(80dvh,34rem)] w-auto flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-20 sm:w-[26.25rem] sm:rounded-2xl"
        >
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
                disabled={markingAllRead}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-60 dark:hover:bg-indigo-950/40 sm:gap-2 sm:text-sm"
              >
                {markingAllRead ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCheck size={16} />
                )}
                <span className="hidden xsm:inline">
                  {markingAllRead ? "Memproses..." : "Tandai semua dibaca"}
                </span>
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
                    className={`w-full border-b border-gray-100 px-4 py-4 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 sm:px-5 ${
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
                        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                          <h4 className="break-words text-sm font-medium text-gray-900 dark:text-white sm:truncate">
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
          <div className="border-t border-gray-200 px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 dark:border-gray-800 sm:py-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
              className="w-full rounded-lg py-1.5 text-center text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/40"
            >
              Lihat semua notifikasi
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
