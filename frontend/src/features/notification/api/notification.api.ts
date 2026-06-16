import api from "@/lib/axios";

export const getNotifications = async () => {
  const response = await api.get("/notifications");
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