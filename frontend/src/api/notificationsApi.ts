import { http } from "./http";

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  bookingId?: string;
  /** ISO 8601 */
  createdAt: string;
}

export interface NotificationSettingsDto {
  notifyBooking: boolean;
  notifyEmail: boolean;
}

export async function fetchNotifications(): Promise<NotificationDto[]> {
  const { data } = await http.get<NotificationDto[]>("/notifications");
  return data;
}

export async function markNotificationRead(id: string): Promise<NotificationDto> {
  const { data } = await http.patch<NotificationDto>(`/notifications/${encodeURIComponent(id)}/read`);
  return data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await http.post("/notifications/read-all");
}

export async function fetchNotificationSettings(): Promise<NotificationSettingsDto> {
  const { data } = await http.get<NotificationSettingsDto>("/notifications/settings");
  return data;
}

export async function updateNotificationSettings(
  patch: Partial<NotificationSettingsDto>
): Promise<NotificationSettingsDto> {
  const { data } = await http.patch<NotificationSettingsDto>("/notifications/settings", patch);
  return data;
}
