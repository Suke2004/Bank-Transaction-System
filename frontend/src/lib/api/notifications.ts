import { apiFetch } from "./client";

export interface NotificationItem {
  _id: string;
  user: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  metadata?: any;
  createdAt: string;
}

export const getNotifications = (
  params: { page?: number; limit?: number; unreadOnly?: boolean } = {},
): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const query = new URLSearchParams(params as any).toString();
  return apiFetch(`/api/v1/notifications?${query}`);
};

export const markAllNotificationsRead = () => apiFetch("/api/v1/notifications/read", { method: "PATCH" });

export const markNotificationRead = (id: string) => apiFetch(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
