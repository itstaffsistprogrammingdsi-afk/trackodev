import api from "@/lib/axios";
import type { AppNotification } from "../types";

export const getNotifications = async (): Promise<{ data: AppNotification[] }> => {
  const response = await api.get<{ data: AppNotification[] }>("/notifications");
  return response.data;
};

export const markNotificationRead = async (
  notificationId: string
) => {
  const response = await api.patch(
    `/notifications/${notificationId}/read`
  );

  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.patch(
    "/notifications/read-all"
  );

  return response.data;
};

export const deleteNotification = async (notificationId: string) => {
  const response = await api.delete(`/notifications/${notificationId}`);

  return response.data;
};
